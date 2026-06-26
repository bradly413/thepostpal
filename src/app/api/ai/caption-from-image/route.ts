import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { buildTenantBrandContext } from "@/lib/ai-brand-context";
import { CAPTION_ANTI_AI_TELLS, CAPTION_SOUND_HUMAN } from "@/lib/ai-caption-voice";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const PLATFORM_GUIDE: Record<string, string> = {
  instagram: "Instagram: conversational, written like a person. 2–4 lowercase hashtags, none forced.",
  facebook: "Facebook: a bit longer and plainspoken, like talking to a regular. 0–2 hashtags.",
};

function isSafeImageUrl(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

function parseOne(text: string): { caption: string; hashtags: string[] } | null {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const v = JSON.parse(raw.slice(start, end + 1));
    const caption = typeof v?.caption === "string" ? v.caption.trim() : "";
    if (!caption) return null;
    const hashtags = Array.isArray(v?.hashtags)
      ? v.hashtags
          .map((h: unknown) => String(h).trim())
          .filter(Boolean)
          .map((h: string) => (h.startsWith("#") ? h : `#${h.replace(/^#+/, "")}`))
      : [];
    return { caption, hashtags };
  } catch {
    return null;
  }
}

/**
 * POST /api/ai/caption-from-image
 * Vision caption: looks at one image and writes a caption + hashtags in the
 * tenant's brand voice. Body: { imageUrl, platform? }. Returns { caption, hashtags }.
 * Any format (incl. avif/heic) is normalized to jpeg ≤1024px via sharp first.
 */
export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("ai-caption-image", req.headers as unknown as Headers, auth), 30, 60_000))) {
      return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: { imageUrl?: unknown; platform?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl || !isSafeImageUrl(imageUrl)) {
    return Response.json({ error: "A valid https imageUrl is required" }, { status: 400 });
  }
  const platform = typeof body.platform === "string" && PLATFORM_GUIDE[body.platform] ? body.platform : "instagram";

  let b64: string;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return Response.json({ error: "Could not load the image" }, { status: 400 });
    const input = Buffer.from(await imgRes.arrayBuffer());
    const jpeg = await sharp(input)
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    b64 = jpeg.toString("base64");
  } catch {
    return Response.json({ error: "Could not process the image" }, { status: 400 });
  }

  const brand = await buildTenantBrandContext(auth, { platform });

  const system = `You write social captions the way a real small-business owner would — like a person, not a brand and not an AI.
Platform: ${platform}. ${PLATFORM_GUIDE[platform]}${brand}

Look at the image and write ONE caption for it, in the brand's voice. If the image has text on it, treat it as a cue — riff on it, don't just repeat it verbatim. ${CAPTION_SOUND_HUMAN}

${CAPTION_ANTI_AI_TELLS}

Respond with ONLY a JSON object (no prose, no code fences):
{"caption":"the caption text","hashtags":["#tag1","#tag2"]}`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
            { type: "text", text: "Write a caption for this post." },
          ],
        },
      ],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = parseOne(text);
    if (!parsed) return Response.json({ error: "Could not generate a caption. Try again." }, { status: 502 });
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Caption generation failed." }, { status: 500 });
  }
}
