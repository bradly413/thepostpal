import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { buildTenantBrandContext } from "@/lib/ai-brand-context";
import { withTenantDb } from "@/lib/db";
import { resolveTenantGuardrails } from "@/lib/compliance/resolve";
import { checkViolations, type ResolvedGuardrails } from "@/lib/compliance/guardrails";
import { CAPTION_ANTI_AI_TELLS, CAPTION_SOUND_HUMAN } from "@/lib/ai-caption-voice";
import { isInlineReferenceImage } from "@/lib/reference-image";
import { loadVisionJpegBase64 } from "@/lib/studio/vision-image-input";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const PLATFORM_GUIDE: Record<string, string> = {
  instagram: "Instagram: conversational, written like a person. 2–4 lowercase hashtags, none forced.",
  facebook: "Facebook: a bit longer and plainspoken, like talking to a regular. 0–2 hashtags.",
  linkedin: "LinkedIn: professional but still human, no emoji, 2–3 niche hashtags.",
  x: "X/Twitter: short and direct, under 280 characters, 0–1 hashtag.",
  tiktok: "TikTok: casual, the first line does the work. 2–4 lowercase hashtags.",
};

interface CaptionVariant {
  angle: string;
  caption: string;
  hashtags: string[];
}

function parseVariants(text: string): CaptionVariant[] {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v): CaptionVariant | null => {
        const caption = typeof v?.caption === "string" ? v.caption.trim() : "";
        if (!caption) return null;
        const hashtags = Array.isArray(v?.hashtags)
          ? v.hashtags
              .map((h: unknown) => String(h).trim())
              .filter(Boolean)
              .map((h: string) => (h.startsWith("#") ? h : `#${h.replace(/^#+/, "")}`))
          : [];
        return {
          angle: typeof v?.angle === "string" && v.angle.trim() ? v.angle.trim() : "Option",
          caption,
          hashtags,
        };
      })
      .filter((v): v is CaptionVariant => v !== null);
  } catch {
    return [];
  }
}

function isSafeImageUrl(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * POST /api/ai/captions-from-image
 * Vision captions: looks at the actual post image and writes multiple caption
 * options in the tenant's brand voice.
 * Body: { imageUrl? | inlineImage?, platform?, count?, context? }
 */
export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("ai-captions-image", req.headers as unknown as Headers, auth), 20, 60_000))) {
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

  let body: {
    imageUrl?: unknown;
    inlineImage?: unknown;
    platform?: unknown;
    count?: unknown;
    context?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const inlineImage = typeof body.inlineImage === "string" ? body.inlineImage.trim() : "";
  const source =
    isInlineReferenceImage(inlineImage)
      ? inlineImage
      : imageUrl && isSafeImageUrl(imageUrl)
        ? imageUrl
        : "";
  if (!source) {
    return Response.json({ error: "A valid inlineImage or https imageUrl is required" }, { status: 400 });
  }

  const platform =
    typeof body.platform === "string" && PLATFORM_GUIDE[body.platform] ? body.platform : "instagram";
  const count = Math.min(Math.max(Number(body.count) || 3, 2), 5);
  const context = typeof body.context === "string" ? body.context.trim().slice(0, 500) : "";

  const imageB64 = await loadVisionJpegBase64(source);
  if (!imageB64) {
    return Response.json({ error: "Could not process the image" }, { status: 400 });
  }

  const brand = await buildTenantBrandContext(auth, { platform });

  const system = `You write social captions the way a real small-business owner would — like a person, not a brand and not an AI.
Platform: ${platform}. ${PLATFORM_GUIDE[platform]}${brand}

Look at the image and write EXACTLY ${count} captions for this post. Each must describe what is actually in the image — not a generic guess from a text brief alone.

${CAPTION_SOUND_HUMAN.replace(
    "Vary length and rhythm — one line or two or three sentences is fine.",
    `Vary length and rhythm across the ${count} options.`,
  )}

${CAPTION_ANTI_AI_TELLS}

Each option should be a genuinely different angle on the same image.

Respond with ONLY a JSON array (no prose, no code fences):
[{"angle":"short label","caption":"the caption text","hashtags":["#tag1","#tag2"]}]`;

  const userText = context
    ? `Optional context from the creator (use only if it matches the image): ${context}`
    : "Write caption options for this post image.";

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1800,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageB64 } },
            { type: "text", text: userText },
          ],
        },
      ],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const variants = parseVariants(text);

    let guardrails: ResolvedGuardrails | null = null;
    try {
      guardrails = await withTenantDb(auth, (tx) => resolveTenantGuardrails(tx, auth.tenantId));
    } catch {
      guardrails = null;
    }

    if (!guardrails) {
      if (variants.length === 0) {
        return Response.json({ error: "Couldn't generate options. Try again." }, { status: 502 });
      }
      return Response.json({ variants });
    }

    const level = guardrails.enforcementLevel;
    const variantText = (v: CaptionVariant) => `${v.caption} ${v.hashtags.join(" ")}`;

    if (level === "block") {
      const kept = variants.filter((v) => checkViolations(variantText(v), guardrails!).length === 0);
      if (kept.length === 0) {
        const flaggedPhrases = [
          ...new Set(
            variants.flatMap((v) =>
              checkViolations(variantText(v), guardrails!).map((x) => x.phrase),
            ),
          ),
        ];
        return Response.json({
          variants: [],
          compliance: {
            blocked: true,
            message: `These captions may not meet ${guardrails.regulatoryBodies.join(", ")} rules.`,
            flaggedPhrases,
          },
        });
      }
      return Response.json({ variants: kept });
    }

    if (variants.length === 0) {
      return Response.json({ error: "Couldn't generate options. Try again." }, { status: 502 });
    }
    return Response.json({ variants });
  } catch {
    return Response.json({ error: "Caption generation failed." }, { status: 500 });
  }
}
