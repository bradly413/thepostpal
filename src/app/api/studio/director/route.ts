import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import {
  buildTenantImageBrandContext,
  buildTenantGeography,
} from "@/lib/ai-brand-context";
import { composeSuffixForBrief, enrichScenicBrief } from "@/lib/studio/scene-intent";
import { validateListingComposeRequest } from "@/lib/studio/studio-image-routing";
import { runDirector } from "@/lib/studio/director";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────
//  POST /api/studio/director
//
//  One Claude turn that classifies AND art-directs a Studio ask: platform,
//  format (carousel plan), text-on-image, clarifying question, final brand-
//  aware imagePrompt. The client falls back to /api/studio/compose (regex
//  route + thin rewrite) whenever this returns an error — never a single
//  point of failure.
//
//  Body: { intent, hasReferenceImage?, lastGenPrompt?, businessType?, locationId? }
// ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (
      !(await rateLimit(
        buildRateLimitKey("studio-director", req.headers as unknown as Headers, auth),
        20,
        60_000,
      ))
    ) {
      return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: {
    intent?: unknown;
    hasReferenceImage?: unknown;
    lastGenPrompt?: unknown;
    businessType?: unknown;
    locationId?: unknown;
    brandLock?: unknown;
    designLane?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  if (!intent || intent.length > 1000) {
    return Response.json({ error: "intent required" }, { status: 400 });
  }
  const hasReferenceImage = body.hasReferenceImage === true;
  const lastGenPrompt =
    typeof body.lastGenPrompt === "string" ? body.lastGenPrompt.slice(0, 600) : undefined;
  const businessType =
    typeof body.businessType === "string" ? body.businessType.slice(0, 120) : undefined;
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

  // Hard server-side gate — the Director never overrides the real-property rule.
  const enrichedIntent = enrichScenicBrief(intent);
  const listingGate = validateListingComposeRequest(enrichedIntent, hasReferenceImage);
  if (!listingGate.ok) {
    return Response.json(
      { error: listingGate.error, code: listingGate.code },
      { status: listingGate.status },
    );
  }

  // Brand lock OFF = creative freedom: skip the palette/style injection.
  // Geography stays — it's factual market truth, not brand styling.
  const brandLock = body.brandLock !== false;
  const designLane = body.designLane === true;
  const [brandContext, geography] = await Promise.all([
    brandLock ? buildTenantImageBrandContext(auth, { locationId }) : Promise.resolve(""),
    buildTenantGeography(auth, locationId),
  ]);

  const decision = await runDirector({
    intent: enrichedIntent,
    businessType,
    brandContext: brandContext || undefined,
    geography: geography || undefined,
    lastGenPrompt,
    hasReferenceImage,
    designLane,
  });

  if (!decision) {
    // Client falls back to the legacy compose path.
    return Response.json({ error: "Director unavailable" }, { status: 502 });
  }

  if (decision.clarify) {
    return Response.json({ clarify: decision.clarify, platform: decision.platform });
  }

  // Design-lane and allowText prompts get their typography-aware suffix in
  // /api/generate-image. Appending the photo-lane compose suffix here would
  // contradict it ("no text or watermark" vs "premium typography") — so only
  // photo-lane prompts carry it.
  const suffix =
    decision.allowText || decision.lane === "design"
      ? ""
      : composeSuffixForBrief(enrichedIntent, decision.styleDirected);

  return Response.json({
    platform: decision.platform,
    lane: decision.lane,
    format: decision.format,
    ...(decision.slides ? { slides: decision.slides } : {}),
    imagePrompt: decision.imagePrompt + suffix,
    allowText: decision.allowText,
    ...(decision.overlayText ? { overlayText: decision.overlayText } : {}),
  });
}
