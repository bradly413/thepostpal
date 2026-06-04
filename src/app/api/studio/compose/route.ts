import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/studio/compose
//   body: { intent: string }   e.g. "make an instagram post about our weekend happy hour"
//   →     { platform, imagePrompt, caption, hashtags[] }
//
// The intent router for non-technical users. They speak in outcomes ("make a
// facebook post about…"); this turns that into a ready-to-generate brief — which
// platform, a real text-to-image prompt, and a finished brand-voice caption +
// hashtags. The image + the post preview are produced downstream in Studio.
//
// NOTE: additive orchestration layer for the Studio composer — flagged for
// Gemini/backend to own + refine (few-shot tuning, model routing).

const PLATFORMS = ["instagram", "facebook", "x", "tiktok", "linkedin"] as const;
type Platform = (typeof PLATFORMS)[number];

export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`compose:${ip}`, 20, 60_000)) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: { intent?: string };
  try {
    body = (await req.json()) as { intent?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const intent = (body.intent || "").trim();
  if (!intent || intent.length > 1000) {
    return Response.json({ error: "intent required" }, { status: 400 });
  }

  // Per-tenant brand voice (falls back to neutral when no brand engine).
  let brand = "";
  try {
    await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true, name: true, businessType: true },
      });
      const dna = readBrandEngineImageContext(org?.brandEngine);
      const lines: string[] = [];
      if (org?.name) lines.push(`Business: ${org.name}${org.businessType ? ` (${org.businessType})` : ""}`);
      if (dna?.niche) lines.push(`Niche: ${dna.niche}`);
      if (dna?.primaryTone) lines.push(`Voice / tone: ${dna.primaryTone}`);
      if (dna?.contrastVibe) lines.push(`Visual vibe: ${dna.contrastVibe}`);
      if (lines.length > 0) brand = `\n\nThis business's brand:\n- ${lines.join("\n- ")}`;
    });
  } catch {
    /* neutral voice */
  }

  const system = `You turn a non-technical small-business owner's request into a ready-to-generate social post. They speak in OUTCOMES ("make an instagram post about our weekend happy hour"), never in image prompts — you do the translation for them.

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
{
  "platform": one of "instagram" | "facebook" | "x" | "tiktok" | "linkedin" (infer from the request; default "instagram" if unstated),
  "imagePrompt": a vivid, concrete text-to-image prompt for a photorealistic social image that fits the request and the brand. Describe subject, setting, lighting, mood, and composition. Do NOT render any text, words, or logos in the image. 1-3 sentences.,
  "caption": a finished, ready-to-publish caption in the brand's voice. Match the platform (Instagram/Facebook warm + conversational, X punchy under 240 chars, LinkedIn professional, TikTok casual). Do NOT include hashtags here.,
  "hashtags": an array of 4-8 relevant hashtag strings, WITHOUT the # sign
}${brand}`;

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: intent }],
    });
    const text = resp.content[0]?.type === "text" ? resp.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: "Could not interpret that request" }, { status: 502 });
    }
    const parsed = JSON.parse(match[0]) as {
      platform?: string;
      imagePrompt?: string;
      caption?: string;
      hashtags?: unknown;
    };
    const platform: Platform = (PLATFORMS as readonly string[]).includes(parsed.platform || "")
      ? (parsed.platform as Platform)
      : "instagram";
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .filter((h): h is string => typeof h === "string")
          .map((h) => h.replace(/^#/, "").trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
    return Response.json({
      platform,
      imagePrompt: typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim() ? parsed.imagePrompt.trim() : intent,
      caption: typeof parsed.caption === "string" ? parsed.caption.trim() : "",
      hashtags,
    });
  } catch (err) {
    console.error("[api/studio/compose] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Compose failed" }, { status: 500 });
  }
}
