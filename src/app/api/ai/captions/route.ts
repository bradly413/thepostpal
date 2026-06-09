import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { buildTenantBrandContext } from "@/lib/ai-brand-context";
import { withTenantDb } from "@/lib/db";
import { resolveTenantGuardrails } from "@/lib/compliance/resolve";
import { checkViolations, type ResolvedGuardrails } from "@/lib/compliance/guardrails";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const PLATFORM_GUIDE: Record<string, string> = {
  instagram: "Instagram: visual-first, conversational, 5–10 hashtags, 1–3 tasteful emoji.",
  facebook: "Facebook: a little longer, story-led, fewer hashtags (2–4), clear CTA.",
  linkedin: "LinkedIn: professional, insight-led, no/low emoji, 3–5 niche hashtags, credible tone.",
  x: "X/Twitter: punchy, under 280 characters, 1–2 hashtags, strong hook.",
  tiktok: "TikTok: playful, trend-aware, hook-first, 3–5 hashtags.",
};

interface CaptionVariant {
  angle: string;
  caption: string;
  hashtags: string[];
}

/** Pull a JSON array out of a model response that may be fenced or chatty. */
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

/**
 * POST /api/ai/captions
 * Generate several distinct caption options for one brief, each from a different
 * angle, in the tenant's brand voice. Body: { brief, platform?, count?, tone? }.
 * Returns { variants: [{ angle, caption, hashtags }] }.
 */
export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`ai-captions:${ip}`, 15, 60_000)) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: { brief?: unknown; platform?: unknown; count?: unknown; tone?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (!brief || brief.length > 2000) {
    return Response.json({ error: "A brief (1–2000 chars) is required" }, { status: 400 });
  }
  const platform = typeof body.platform === "string" && PLATFORM_GUIDE[body.platform]
    ? body.platform
    : "instagram";
  const count = Math.min(Math.max(Number(body.count) || 3, 2), 5);
  const tone = typeof body.tone === "string" && body.tone.trim() ? body.tone.trim() : "";

  const brand = await buildTenantBrandContext(auth);

  const system = `You are an expert social copywriter. Write captions for ${platform}.
${PLATFORM_GUIDE[platform]}${brand}

Produce EXACTLY ${count} DISTINCT caption variants for the same brief. Each must take a genuinely different angle — e.g. benefit-led, story/emotional, punchy hook + CTA, playful, authority/insight. Do not repeat phrasing across variants.${tone ? `\nOverall tone preference: ${tone}.` : ""}

Respond with ONLY a JSON array (no prose, no code fences) of this exact shape:
[{"angle":"short label","caption":"the caption text","hashtags":["#tag1","#tag2"]}]`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1800,
      system,
      messages: [{ role: "user", content: brief }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const variants = parseVariants(text);

    // Resolve compliance guardrails (null = tenant has no vertical → behave
    // exactly as before). Best-effort: never throws.
    let guardrails: ResolvedGuardrails | null = null;
    try {
      guardrails = await withTenantDb(auth, (tx) => resolveTenantGuardrails(tx, auth.tenantId));
    } catch {
      guardrails = null;
    }

    // No vertical → preserve the existing response shape byte-for-byte, including
    // the legacy 502 for a genuine generation failure (model returned junk).
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
        // Compliance-driven refusal — NEVER a bare 502. 200 with an explicit
        // compliance payload so the caption picker can surface a clear message.
        const flaggedPhrases = [
          ...new Set(
            variants.flatMap((v) =>
              checkViolations(variantText(v), guardrails!).map((x) => x.phrase),
            ),
          ),
        ];
        const bodies = guardrails.regulatoryBodies.join(", ");
        return Response.json({
          variants: [],
          compliance: {
            blocked: true,
            level: "block",
            flaggedPhrases,
            message: `This request conflicts with your compliance guardrails${
              bodies ? ` (${bodies})` : ""
            }. Rephrase without restricted claims, or send for compliance review.`,
          },
        });
      }
      return Response.json({ variants: kept });
    }

    // "warn" / "suggest": keep ALL variants unchanged; add an additive top-level
    // compliance flag list (only for variants that actually violated).
    if (variants.length === 0) {
      return Response.json({ error: "Couldn't generate options. Try again." }, { status: 502 });
    }
    const flags = variants
      .map((v, variantIndex) => {
        const phrases = [
          ...new Set(checkViolations(variantText(v), guardrails!).map((x) => x.phrase)),
        ];
        return phrases.length ? { variantIndex, phrases } : null;
      })
      .filter((f): f is { variantIndex: number; phrases: string[] } => f !== null);

    if (flags.length === 0) {
      // Nothing flagged — keep the exact legacy shape (no compliance key).
      return Response.json({ variants });
    }
    return Response.json({ variants, compliance: { level, flags } });
  } catch (err) {
    console.error("[api/ai/captions] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "AI request failed" }, { status: 500 });
  }
}
