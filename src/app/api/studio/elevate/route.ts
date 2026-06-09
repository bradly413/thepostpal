import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { buildTenantBrandContext } from "@/lib/ai-brand-context";
import { withTenantDb } from "@/lib/db";
import { resolveTenantGuardrails } from "@/lib/compliance/resolve";
import { checkViolations, type ResolvedGuardrails } from "@/lib/compliance/guardrails";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6"; // has vision

interface ElevateResult {
  caption: string;
  hashtags: string[];
  altText: string;
}

const ALLOWED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Pull a single JSON object out of a model response that may be fenced or chatty. */
function parseElevate(text: string): ElevateResult | null {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const caption = typeof parsed?.caption === "string" ? parsed.caption.trim() : "";
    if (!caption) return null;
    const hashtags = Array.isArray(parsed?.hashtags)
      ? parsed.hashtags
          .map((h: unknown) => String(h).trim())
          .filter(Boolean)
          .map((h: string) => (h.startsWith("#") ? h : `#${h.replace(/^#+/, "")}`))
      : [];
    const altText = typeof parsed?.altText === "string" ? parsed.altText.trim() : "";
    return { caption, hashtags, altText };
  } catch {
    return null;
  }
}

/** Fetch the image and return a base64 source block when the URL source can't be used. */
async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ mediaType: string; data: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
  const mediaType = ALLOWED_MEDIA.has(contentType) ? contentType : "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mediaType, data: buf.toString("base64") };
}

/**
 * POST /api/studio/elevate
 * Trash-to-Treasure vision auto-caption. Takes an uploaded photo URL, looks at the
 * image with claude-sonnet-4-6, and returns a brand-voice caption + hashtags + alt
 * text. Body: { imageUrl }. Returns { caption, hashtags, altText } plus an additive
 * `compliance` flag when the tenant has guardrails. Backward-compatible shape.
 */
export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`studio-elevate:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: { imageUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl) || imageUrl.length > 2000) {
    return Response.json({ error: "A valid image URL is required" }, { status: 400 });
  }

  const brand = await buildTenantBrandContext(auth);

  const system = `You are an expert social copywriter and photo editor. You are shown ONE photo. Look at it carefully and write a brand-voice social caption that elevates it from a raw snapshot into polished, on-brand content.${brand}

Respond with ONLY a JSON object (no prose, no code fences) of this exact shape:
{"caption":"a brand-voice caption for this photo","hashtags":["#tag1","#tag2"],"altText":"a concise, descriptive alt text of the photo for accessibility"}
Include 5-8 relevant hashtags. The altText must describe what is actually visible in the photo.`;

  // Prefer the URL image source; the model fetches the photo itself.
  const imageBlock: Anthropic.ImageBlockParam = {
    type: "image",
    source: { type: "url", url: imageUrl },
  };

  try {
    const client = new Anthropic({ apiKey });

    let text = "";
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system,
        messages: [
          {
            role: "user",
            content: [
              imageBlock,
              { type: "text", text: "Elevate this photo into a brand-voice post." },
            ],
          },
        ],
      });
      text = response.content[0]?.type === "text" ? response.content[0].text : "";
    } catch (err) {
      // Some hosting setups block the model from fetching the URL — retry once
      // with the image inlined as base64 before giving up.
      const { mediaType, data } = await fetchImageAsBase64(imageUrl);
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType as never, data },
              },
              { type: "text", text: "Elevate this photo into a brand-voice post." },
            ],
          },
        ],
      });
      text = response.content[0]?.type === "text" ? response.content[0].text : "";
      if (!text) throw err;
    }

    const result = parseElevate(text);
    if (!result) {
      return Response.json({ error: "Couldn't read that photo. Try again." }, { status: 502 });
    }

    // Resolve compliance guardrails (null = tenant has no vertical → behave as
    // before, just return the caption). Best-effort: never throws.
    let guardrails: ResolvedGuardrails | null = null;
    try {
      guardrails = await withTenantDb(auth, (tx) => resolveTenantGuardrails(tx, auth.tenantId));
    } catch {
      guardrails = null;
    }

    // No vertical → plain caption shape.
    if (!guardrails) {
      return Response.json(result);
    }

    const level = guardrails.enforcementLevel;
    const captionText = `${result.caption} ${result.hashtags.join(" ")}`;
    const violations = checkViolations(captionText, guardrails);
    const flaggedPhrases = [...new Set(violations.map((v) => v.phrase))];

    if (level === "block" && violations.length > 0) {
      // Compliance-driven block — no caption returned, explicit payload.
      const bodies = guardrails.regulatoryBodies.join(", ");
      return Response.json({
        compliance: {
          blocked: true,
          level: "block",
          flaggedPhrases,
          message: `This caption conflicts with your compliance guardrails${
            bodies ? ` (${bodies})` : ""
          }. Try a different photo, or edit the caption before posting.`,
        },
      });
    }

    if (violations.length === 0) {
      // Nothing flagged — clean caption (no compliance key).
      return Response.json(result);
    }

    // "warn" / "suggest" (or "block" that didn't actually violate) → additive flag.
    return Response.json({ ...result, compliance: { level, flaggedPhrases } });
  } catch (err) {
    console.error("[api/studio/elevate] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "AI request failed" }, { status: 500 });
  }
}
