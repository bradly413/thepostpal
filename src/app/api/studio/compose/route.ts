import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { buildTenantBrandContext, buildTenantImageBrandContext } from "@/lib/ai-brand-context";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { composeSuffixForBrief, enrichScenicBrief, isListingBrief, isScenicBrief, LISTING_WITH_PHOTO_COMPOSE_BLOCK, photoDirectionForBrief, SCENIC_COMPOSE_BLOCK } from "@/lib/studio/scene-intent";
import { validateListingComposeRequest } from "@/lib/studio/studio-image-routing";

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

  const locationId = typeof body.locationId === "string" ? body.locationId : null;

  // Per-tenant brand context — voice (incl. the onboarding brand book) plus
  // visual photography/palette direction. "" when the tenant has neither.
  const [brand, visualBrand] = await Promise.all([
    buildTenantBrandContext(auth, { locationId }),
    buildTenantImageBrandContext(auth, { locationId }),
  ]);
  const visualBlock = visualBrand
    ? `\n\nBrand visual direction (honor in imagePrompt):\n${visualBrand}`
    : "";

  const photoDirection = photoDirectionForBrief(enrichedIntent);
  const scenicBlock = isScenicBrief(enrichedIntent) ? SCENIC_COMPOSE_BLOCK : "";
  const listingBlock = listingBrief && hasReferenceImage ? LISTING_WITH_PHOTO_COMPOSE_BLOCK : "";
  const realPropertyRule = listingBrief
    ? ""
    : `REAL PROPERTY RULE: if the request is about a specific property, listing, address, or a home that sold/listed, you CANNOT know what that property looks like — NEVER describe an invented house, building, or interior as if it were the listing. The owner must add their listing photo; do not substitute generic keys, cafe scenes, or invented facades.`;

  const system = `You turn a non-technical small-business owner's request into a ready-to-generate social post. They speak in OUTCOMES ("make an instagram post about our weekend happy hour"), never in image prompts — you do the translation for them.
${scenicBlock}${listingBlock}

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
{
  "platform": one of "instagram" | "facebook" | "x" | "tiktok" | "linkedin" (infer from the request; default "instagram" if unstated),
  "styleDirected": boolean — true ONLY if the owner explicitly asked for a specific photographic look or style (e.g. "professional shot", "cinematic", "dark background", "studio lighting", "moody", "luxury", "editorial", "dramatic"). Mentioning the subject alone is NOT style direction.,
  "imagePrompt": a photo description (2-4 sentences).
    IF styleDirected: honor the owner's stated look fully and skillfully — translate it into real photography language (specific lighting, lens, surface, composition, mood) that delivers exactly the style they asked for at a high professional standard. Do not water it down toward casual realism.
    OTHERWISE (no style stated — the default): ${photoDirection} Describe the scene with enough spatial detail that a wide shot is obvious when the subject is a place, beach, landscape, or outdoor scene — include sky, horizon, water, and surrounding environment in frame. Camera level and straight at eye level unless the brief asks otherwise — no dutch angle, no dramatic tilt. For product/interior scenes: honest mundane detail (worn wood, steam, scuffs). Ban AI/stock tells: no plastic skin, no CGI gloss, no extreme close-up crop of a single object when a scenic vista is implied, no watermarks.
    ALWAYS: do NOT render any text, words, captions, watermarks, or logos in the image. Never describe it as an illustration, render, or cartoon.
    ${realPropertyRule}
  (No caption here — captions are written in a dedicated step after the image,
  with the brand's voice rules. Keep this response to the three keys above.)
}${brand}${visualBlock}`;

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 450,
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
        (typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim() ? parsed.imagePrompt.trim() : enrichedIntent) +
        // The anti-gloss suffix is the DEFAULT, not a mandate: when the owner
        // explicitly directed a style ("professional shot, dark background"),
        // honor it instead of forcing phone-photo realism over their ask.
        (styleDirected
          ? composeSuffixForBrief(enrichedIntent, true)
          : composeSuffixForBrief(enrichedIntent, false)),
      // M2 (audit): the studio writes captions in a dedicated post-image step;
      // generating one here was paid tokens thrown away on every request.
      caption: "",
      hashtags: [],
    });
  } catch (err) {
    console.error("[api/studio/compose] failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Compose failed" }, { status: 500 });
  }
}
