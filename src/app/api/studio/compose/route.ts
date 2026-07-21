import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import {
  composeSuffixForBrief,
  enrichScenicBrief,
  isBrandOutcomeBrief,
  isListingBrief,
  isScenicBrief,
  LISTING_WITH_PHOTO_COMPOSE_BLOCK,
  photoDirectionForBrief,
  SCENIC_COMPOSE_BLOCK,
} from "@/lib/studio/scene-intent";
import { validateListingComposeRequest } from "@/lib/studio/studio-image-routing";

// POST /api/studio/compose
// Thin outcome → imagePrompt rewrite. Direct visual briefs skip this route
// (see needsComposeRewrite / direct_generate).

const PLATFORMS = ["instagram", "facebook", "x", "tiktok", "linkedin"] as const;
type Platform = (typeof PLATFORMS)[number];

export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(
      buildRateLimitKey("compose", req.headers as unknown as Headers, auth),
      20,
      60_000,
    ))) {
      return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: { intent?: string; locationId?: string; hasReferenceImage?: boolean };
  try {
    body = (await req.json()) as { intent?: string; locationId?: string; hasReferenceImage?: boolean };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const intent = (body.intent || "").trim();
  if (!intent || intent.length > 1000) {
    return Response.json({ error: "intent required" }, { status: 400 });
  }

  const locationId = typeof body.locationId === "string" ? body.locationId : null;
  if (locationId) {
    const allowed = await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      return access.hasAccess;
    });
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const enrichedIntent = enrichScenicBrief(intent);
  const hasReferenceImage = body.hasReferenceImage === true;
  const listingBrief = isListingBrief(enrichedIntent);
  const listingGate = validateListingComposeRequest(enrichedIntent, hasReferenceImage);
  if (!listingGate.ok) {
    return Response.json(
      { error: listingGate.error, code: listingGate.code },
      { status: listingGate.status },
    );
  }

  const brandOutcome = isBrandOutcomeBrief(enrichedIntent);
  const photoDirection = photoDirectionForBrief(enrichedIntent);
  const scenicBlock = isScenicBrief(enrichedIntent) ? SCENIC_COMPOSE_BLOCK : "";
  const listingBlock = listingBrief && hasReferenceImage ? LISTING_WITH_PHOTO_COMPOSE_BLOCK : "";
  const brandHeroHint = brandOutcome
    ? `Brand/business ask without a named product: feature a person (beauty/wellness portrait), not invented product bottles.`
    : "";
  const realPropertyRule = listingBrief
    ? ""
    : `If the request is about a specific listing/address, do not invent the property — the owner must attach a photo.`;

  const system = `Rewrite the owner's social outcome into a short image-generation prompt. Keep it light — Gemini does the heavy lifting.
${scenicBlock}${listingBlock}

Return ONLY JSON (no markdown) with:
{
  "platform": "instagram" | "facebook" | "x" | "tiktok" | "linkedin" (default instagram),
  "styleDirected": true only if they named a photographic look (cinematic, dark, studio, etc.),
  "imagePrompt": 1–3 sentences describing the photo.
    Default look: ${photoDirection}
    Put the hero subject first. Real photograph — no text/watermark/CGI.
    ${brandHeroHint}
    ${realPropertyRule}
}`;

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 350,
      system,
      messages: [{ role: "user", content: enrichedIntent }],
    });
    const text = resp.content[0]?.type === "text" ? resp.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: "Could not interpret that request" }, { status: 502 });
    }
    const parsed = JSON.parse(match[0]) as {
      platform?: string;
      styleDirected?: unknown;
      imagePrompt?: string;
    };
    const styleDirected = parsed.styleDirected === true;
    const platform: Platform = (PLATFORMS as readonly string[]).includes(parsed.platform || "")
      ? (parsed.platform as Platform)
      : "instagram";
    return Response.json({
      platform,
      imagePrompt:
        (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()
          ? parsed.imagePrompt.trim()
          : enrichedIntent) + composeSuffixForBrief(enrichedIntent, styleDirected),
      caption: "",
      hashtags: [],
    });
  } catch (err) {
    console.error("[api/studio/compose] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Compose failed" }, { status: 500 });
  }
}
