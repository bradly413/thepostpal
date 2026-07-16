import { generateText } from "ai";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { buildTenantBrandContext } from "@/lib/ai-brand-context";
import { withTenantDb } from "@/lib/db";
import { resolveTenantGuardrails } from "@/lib/compliance/resolve";
import { checkViolations, type ResolvedGuardrails } from "@/lib/compliance/guardrails";
import { CAPTION_ANTI_AI_TELLS } from "@/lib/ai-caption-voice";
import { isInlineReferenceImage } from "@/lib/reference-image";
import { loadVisionJpegBase64 } from "@/lib/studio/vision-image-input";
import { aiTelemetry, getLanguageModel, useAiGateway } from "@/lib/ai/model";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  if (!useAiGateway() && !process.env.ANTHROPIC_API_KEY?.trim()) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: {
    imageUrl?: unknown;
    inlineImage?: unknown;
    platform?: unknown;
    count?: unknown;
    context?: unknown;
    locationId?: unknown;
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
  const locationId = typeof body.locationId === "string" ? body.locationId.trim() || null : null;

  const imageB64 = await loadVisionJpegBase64(source);
  if (!imageB64) {
    return Response.json({ error: "Could not process the image" }, { status: 400 });
  }

  const brand = await buildTenantBrandContext(auth, { platform, locationId });

  const creatorIntent = `Interpret the creator's notes intelligently:
- If they pasted a finished caption, lightly polish it to match the image and platform — preserve their voice, do not replace it.
- If they wrote an idea, theme, or scattered thoughts, synthesize those into real captions grounded in what you see.
- If notes are empty, write from the image and brand voice only.
Notes are guidance — never claim things not visible in the image.`;

  const system = `You write short social captions for local businesses — simple, clear, offer-first.
Platform: ${platform}. ${PLATFORM_GUIDE[platform]}${brand}

${creatorIntent}

Look at the image and write EXACTLY ${count} captions for this post.

STEP 1 — Identify the REAL subject in the photo first:
- What is actually shown? Product, service moment, place, people, promo graphic, etc.
- On-image headlines are marketing copy, NOT always the product. Caption the real offer, not a metaphor on the graphic.
- Never invent details that are not visible or stated in the brand/notes.

STEP 2 — Write captions that sell that offer.

TARGET STYLE (match this closely):
"Try our weekend special. #weekend"
"Gift cards make everyone happy. #giftcards"
"Book your consultation this week. #local"
"New arrivals just dropped. #new"

Rules:
- One short sentence. Name the actual offer you see.
- Friendly, direct, obvious — adapt to the business niche from brand context.
- End with ONE simple hashtag when it fits. Put it in the hashtags array, not inside the caption string.
- No artsy observations, no soft preambles, no essays, no rhetorical questions.
- Never narrate the picture. Never quote on-image text word for word.
- Vary the angle across the ${count} options but keep the same short shape.

${CAPTION_ANTI_AI_TELLS}

Respond with ONLY a JSON array (no prose, no code fences):
[{"angle":"short label","caption":"Gift cards make everyone happy.","hashtags":["#giftcards"]}]`;

  const userText = context
    ? `Creator notes:\n${context}`
    : "Write short offer captions. Identify the real subject in the photo first.";

  try {
    const result = await generateText({
      model: getLanguageModel("sonnet"),
      system,
      maxOutputTokens: 1800,
      experimental_telemetry: aiTelemetry("ai-captions-from-image", {
        feature: "captions-from-image",
        tenantId: auth.tenantId,
        platform,
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: `data:image/jpeg;base64,${imageB64}` },
            { type: "text", text: userText },
          ],
        },
      ],
    });
    const text = result.text || "";
    const variants = parseVariants(text);

    let guardrails: ResolvedGuardrails | null = null;
    try {
      guardrails = await withTenantDb(auth, (tx) => resolveTenantGuardrails(tx, auth.tenantId));
    } catch {
      guardrails = null;
    }

    if (!guardrails) {
      if (variants.length === 0) {
        return Response.json(
          {
            error: "Couldn't parse caption options from the model. Try again.",
            debug: process.env.NODE_ENV === "development" ? text.slice(0, 400) : undefined,
          },
          { status: 502 },
        );
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
      return Response.json(
        {
          error: "Couldn't parse caption options from the model. Try again.",
          debug: process.env.NODE_ENV === "development" ? text.slice(0, 400) : undefined,
        },
        { status: 502 },
      );
    }

    // warn / suggest: keep variants; surface flags like /api/ai/captions
    const flags = variants
      .map((v, variantIndex) => {
        const phrases = [
          ...new Set(checkViolations(variantText(v), guardrails!).map((x) => x.phrase)),
        ];
        return phrases.length ? { variantIndex, phrases } : null;
      })
      .filter((f): f is { variantIndex: number; phrases: string[] } => f !== null);

    if (flags.length === 0) {
      return Response.json({ variants });
    }
    return Response.json({ variants, compliance: { level, flags } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Caption generation failed.";
    // Vision fetch / Anthropic / image decode failures land here.
    return Response.json(
      {
        error: message.includes("fetch") || message.includes("image")
          ? "Couldn't read that image. Try another one."
          : "Caption generation failed. Try again.",
        debug: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
