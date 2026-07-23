import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import {
  buildTenantImageBrandContext,
  buildTenantGeography,
} from "@/lib/ai-brand-context";
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
import { extractMessageText } from "@/lib/ai/message-text";

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

  let body: { intent?: string; locationId?: string; hasReferenceImage?: boolean; brandLock?: boolean };
  try {
    body = (await req.json()) as typeof body;
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
  const websiteBrand =
    /\bwebsite\s+brand\s+reference\b/i.test(enrichedIntent) ||
    (/\b(website|site)\b/i.test(enrichedIntent) && hasReferenceImage);
  const websiteBlock = websiteBrand
    ? `WEBSITE BRAND: The owner linked their site and may have attached its hero/og image. Match that brand's colors, mood, and subject — scale into a social-ready photograph (Instagram/Facebook crop). Not a browser screenshot or landing-page mockup unless they asked for one. Stay on-brand; do not invent a different business.`
    : "";
  const brandHeroHint = brandOutcome
    ? `Brand/business ask without a named product: feature a person (beauty/wellness portrait), not invented product bottles.`
    : "";
  const realPropertyRule = listingBrief
    ? ""
    : `If the request is about a specific listing/address, do not invent the property — the owner must attach a photo.`;

  // Brand-aware compose: palette, photography style, and market geography so
  // the FIRST generation already looks like this business. Both loaders return
  // "" on any failure — compose never blocks on brand data.
  const [brandContext, geography] = await Promise.all([
    body.brandLock === false
      ? Promise.resolve("")
      : buildTenantImageBrandContext(auth, { locationId }),
    buildTenantGeography(auth, locationId),
  ]);
  const brandBlock = brandContext
    ? `\nBRAND VISUAL DIRECTION (honor without dulling vibrancy):\n${brandContext}`
    : "";
  const geoBlock = geography
    ? `\nGEOGRAPHY: ${geography} — match region (architecture, vegetation, light); never tropical/coastal unless asked; no invented landmarks.`
    : "";

  const system = `Rewrite the owner's social outcome into a short image-generation prompt. Keep it light — Gemini does the heavy lifting.
${scenicBlock}${listingBlock}${websiteBlock ? `\n${websiteBlock}` : ""}${brandBlock}${geoBlock}

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
      model: "claude-sonnet-5",
      // Structured/routing call — reasoning would only add latency + budget risk.
      thinking: { type: "disabled" },
      max_tokens: 350,
      system,
      messages: [{ role: "user", content: enrichedIntent }],
    });
    const text = extractMessageText(resp.content);
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
