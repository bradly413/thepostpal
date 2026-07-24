import {
  LEVEL_CAMERA_HINT,
  REAL_PHOTO_COMPOSE_SUFFIX,
  REAL_PHOTO_DEFAULT_DIRECTION,
  REAL_PHOTO_GENERATION_SUFFIX,
  REAL_PHOTO_REFERENCE_SUFFIX,
} from "@/lib/studio/image-prompt-vivid";

/** Detect scenic/travel/landscape briefs vs local-business documentary shots. */

const SCENIC_RE =
  /\b(beach|palm|ocean|sea|shore|coast|coastal|tropical|island|bay|harbor|sunset|sunrise|skyline|landscape|mountain|valley|forest|waterfall|lake|river|waves|surf|sand|dune|horizon|scenic|vista|paradise|caribbean|hawaii|tree|flowers?|garden|meadow|wildflower)\b/i;

/** Brief names a place the business owns — keep documentary realism. */
const BUSINESS_CONTEXT_RE =
  /\b(our|my|at\s+the|restaurant|store|shop|office|salon|cafe|bar|gym|yoga\s+studio|photo\s+studio|business|neighborhood|street|downtown|home|house|building|storefront|patio|lobby|interior|kitchen|menu|staff|team|customer|client|property|listing|open\s+house)\b/i;

/**
 * Food / drink / product / beauty heroes — never attach tenant geography or landmarks.
 * Bare "studio"/"city" used to false-trigger place context and pull in the Arch.
 * Portraits & med-spa beauty also stay commercial-studio (demo café books otherwise
 * leak brick/wood/mug lifestyle into every headshot).
 */
const PRODUCT_HERO_RE =
  /\b(smoothie|milkshake|coffee|latte|espresso|cappuccino|cocktail|mocktail|wine|beer|burger|pizza|taco|sushi|salad|soup|pasta|steak|sandwich|dessert|cake|cookie|pastry|donut|bagel|juice|tea|matcha|acai|bowl|plate|dish|meal|food|drink|beverage|bottle|candle|lipstick|skincare|serum|soap|shampoo|perfume|sneakers|handbag|product|portrait|headshot|beauty|glowing?\s+skin|skin\s+glow|wellness|med(?:ical)?\s*spa|injectable|botox|filler|facial|cosmetic|makeup|close-?up)\b/i;

export function isProductHeroBrief(text: string): boolean {
  return PRODUCT_HERO_RE.test(text.trim());
}

/** Explicit product packaging — owner asked for a bottle/flat-lay, not a brand hero. */
const EXPLICIT_PRODUCT_SHOT_RE =
  /\b(bottle|serum|dropper|flat[\s-]?lay|product\s+shot|skincare\s+(bottle|jar|tube)|packaging|jar\s+of|tube\s+of)\b/i;

/**
 * "Create an image for Aurora Med Spa" / bare spa brand asks — NOT a catalog
 * product shot. Compose must pick a person/glow brand hero, not invent bottles.
 */
const BRAND_OUTCOME_RE =
  /\b((create|make|generate|design)\s+(an?\s+)?(image|photo|picture|post|instagram\s+post|facebook\s+post)\s+(for|about)|(?:image|photo|picture|post)\s+for)\b/i;

const SPA_BRAND_RE =
  /\b(med(?:ical)?\s*spa|beauty\s+(clinic|spa)|wellness\s+(spa|clinic|center)|aesthetic\s+clinic|dermatolog(?:y|ist)?)\b/i;

/** Product launch / marketing-ad asks — designed graphic, not a beauty portrait. */
const PRODUCT_AD_RE =
  /\b(new|launch|introducing|announce|promo|promotion|advertisement|marketing\s+(image|post|graphic)|product\s+ad|ad\s+for)\b/i;

const SITE_URL_BRIEF_RE = /\buse\s+\S+\.(?:com|net|org|co|io)\b/i;

export function isProductAdBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (EXPLICIT_PRODUCT_SHOT_RE.test(t) && !PRODUCT_AD_RE.test(t) && !SITE_URL_BRIEF_RE.test(t)) {
    return false;
  }
  // A URL plus "launch" is not enough: "company launch ... use example.com"
  // describes a service-brand announcement, not a physical product. Requiring
  // a product subject prevents the design lane from inventing packaging.
  if (PRODUCT_AD_RE.test(t) && isProductHeroBrief(t)) return true;
  if (SITE_URL_BRIEF_RE.test(t) && isProductHeroBrief(t)) return true;
  if (
    BRAND_OUTCOME_RE.test(t) &&
    isProductHeroBrief(t) &&
    /\b(our|the)\s+(new|latest)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** OpenAI-style product-ad brief — multimodal refs carry the product look. */
export function buildProductAdPrompt(
  enrichedBrief: string,
  opts?: { hasReferenceImages?: boolean },
): string {
  const intro = opts?.hasReferenceImages
    ? "Generate a polished vertical social-media product advertisement using the reference product images and the brand facts below."
    : "Generate a polished vertical social-media product advertisement using only the product and brand facts below. Do not invent packaging or a physical product that is not explicitly described.";
  return [
    intro,
    enrichedBrief,
    "Layout: hero product photography only when a physical product is explicitly named; match packaging only when it is clearly shown in a reference. Use an elegant headline with the verified product name and restrained supporting copy — all correctly spelled.",
    "Use the reference brand palette when shown. Do not invent statistics, benefits, claims, awards, reviews, packaging, logos, or client marks. Use only facts present in the brief or visible in the references.",
  ].join(" ");
}

export function isBrandOutcomeBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isProductAdBrief(t)) return false;
  if (EXPLICIT_PRODUCT_SHOT_RE.test(t)) return false;
  if (BRAND_OUTCOME_RE.test(t)) return true;
  // Bare spa/clinic name with no concrete visual subject → brand hero, not bottles.
  if (SPA_BRAND_RE.test(t)) {
    if (
      /\b(portrait|headshot|close-?up|glowing|skin\s+glow|woman|man|facial|injectable|botox|filler|treatment|client)\b/i.test(
        t,
      )
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/** Specific property / listing / address — needs the owner's photo, not an AI guess. */
const LISTING_BRIEF_RE =
  /\b(new\s+listing|just\s+listed|just\s+sold|sold\s+at|open\s+house|under\s+contract|new\s+on\s+the\s+market|my\s+listing|our\s+listing|listing\s+at|listed\s+at|for\s+sale\s+at)\b/i;

const STREET_ADDRESS_RE =
  /\b\d{1,6}\s+[a-z0-9][a-z0-9'.\-\s]{1,48}\b(?:st\.?|street|rd\.?|road|dr\.?|drive|ln\.?|lane|ave\.?|avenue|ct\.?|court|blvd\.?|boulevard|cir\.?|circle|way|pl\.?|place|ter\.?|terrace|pkwy\.?|parkway|hwy\.?|highway)\b/i;

const LISTING_ZIP_RE = /\b\d{5}(?:-\d{4})?\b/;

export function isListingBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (LISTING_BRIEF_RE.test(t)) return true;
  if (STREET_ADDRESS_RE.test(t)) return true;
  if (/\b(listing|property|open\s+house)\b/i.test(t) && LISTING_ZIP_RE.test(t)) return true;
  return false;
}

/**
 * True when the brief implies a real place / venue / scenic setting.
 * Product/color-only briefs ("vibrant red smoothie") should NOT get geography
 * or "match regional architecture" anchors — those push dull cafe kitchens
 * and local landmarks (e.g. Gateway Arch for St. Louis tenants).
 */
export function briefNeedsSceneGeography(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isListingBrief(t)) return true;
  // Product heroes stay product-forward unless the owner explicitly names a venue.
  if (isProductHeroBrief(t) && !/\b(our|my|at\s+the|in\s+our|at\s+our)\b/i.test(t)) {
    return false;
  }
  if (isScenicBrief(t)) return true;
  return BUSINESS_CONTEXT_RE.test(t);
}

const PLATFORM_FROM_INTENT_RE: Array<{ id: string; re: RegExp }> = [
  { id: "instagram", re: /\binstagram\b/i },
  { id: "facebook", re: /\bfacebook\b/i },
  { id: "tiktok", re: /\btiktok\b/i },
  { id: "linkedin", re: /\blinkedin\b/i },
  { id: "x", re: /\b(twitter|(?<![a-z])x(?![a-z]))\b/i },
];

/** Infer social platform from a natural-language intent string. */
export function inferPlatformIdFromIntent(intent: string): string | null {
  for (const { id, re } of PLATFORM_FROM_INTENT_RE) {
    if (re.test(intent)) return id;
  }
  return null;
}

export const LISTING_WITH_PHOTO_COMPOSE_BLOCK = `
LISTING WITH PHOTO: The owner attached their listing photograph. imagePrompt MUST use the property in that reference as the hero — professional real-estate photography (curb appeal, bright natural daylight or golden hour, clean composition). Preserve the same building/facade from the reference; do NOT invent a different house. Wide or three-quarter exterior when the reference shows the front; interior only if the reference is interior. Editorial MLS-meets-Instagram — NOT generic keys, NOT cafe tables, NOT stock lifestyle props unless the brief explicitly asks. No text, address overlays, or watermarks in the image.`;

export const LISTING_REFERENCE_GENERATION_SUFFIX =
  " Preserve the exact property/building from the reference photograph — same house, same facade, same listing. Professional real-estate photography. No invented property, no generic keys-on-table scene, no text or watermark.";

export function isScenicBrief(text: string): boolean {
  return SCENIC_RE.test(text.trim());
}

/** Short subject-only scenic prompts ("a palm tree") with no business/urban context. */
export function isMinimalScenicBrief(text: string): boolean {
  const t = text.trim();
  if (!isScenicBrief(t)) return false;
  if (BUSINESS_CONTEXT_RE.test(t)) return false;
  return t.split(/\s+/).length <= 8;
}

/** Default aspirational setting when the owner names nature without a place. */
export function scenicSettingForBrief(brief: string): string | null {
  const t = brief.trim().toLowerCase();
  if (/\bpalm\b/.test(t)) {
    return "white-sand tropical beach with calm turquoise Caribbean water, blue sky with soft clouds, and a clear horizon line";
  }
  if (/\b(beach|ocean|sea|shore|coast|coastal|waves|surf|sand)\b/.test(t)) {
    return "pristine tropical coastline with white sand, turquoise water, blue sky, and visible horizon";
  }
  if (/\b(sunset|sunrise)\b/.test(t)) {
    return "open ocean horizon at golden hour with warm sky gradients and calm water";
  }
  if (/\b(mountain|valley|forest|waterfall|lake|river|landscape|scenic|vista)\b/.test(t)) {
    return "sweeping natural landscape with sky, horizon, and full environment in frame";
  }
  if (/\b(tree|flowers?|garden|meadow|wildflower)\b/.test(t)) {
    return "lush natural outdoor setting with soft daylight and open sky";
  }
  return "beautiful natural outdoor setting with sky and horizon visible";
}

/** Pre-expand bare scenic subjects so compose/art-director don't invent urban grit. */
export function enrichScenicBrief(brief: string): string {
  const t = brief.trim();
  if (!isMinimalScenicBrief(t)) return t;
  const setting = scenicSettingForBrief(t);
  if (!setting) return t;
  if (/\b(on|at|in|by|near|along|overlooking)\b/i.test(t)) return t;
  return `${t} on a ${setting}`;
}

/** Wide travel/nature — full postcard scenes, not tight object crops. */
export const SCENIC_PHOTO_DIRECTION = `aspirational travel and lifestyle photography for a polished Instagram post — vivid, inviting, beautiful like a real vacation photo, not documentary urban grit. Wide establishing shot with the FULL scene in frame: sky, horizon, and environment visible. Level camera, natural proportions. Only use pristine tropical beach when the brief names palms, beach, ocean, tropical, or coastal — otherwise prefer a general natural vista that can match the owner's region. NEVER a suburban street, neighborhood, sidewalk, parked cars, houses, or power lines unless the brief explicitly asks. ${LEVEL_CAMERA_HINT} NOT an extreme close-up, NOT oversized CGI props, NOT illustration, NOT 3D render.`;

export const SCENIC_COMPOSE_SUFFIX =
  " Wide aspirational scenic shot, natural vista (tropical only if the brief asks), level horizon, vivid travel photography — not suburban street, not urban neighborhood, not extreme close-up, no watermark, no dreamstime, no text.";

export const SCENIC_GENERATION_SUFFIX =
  ` Wide establishing travel photograph with sky and horizon visible. Level camera, natural proportions, aspirational Instagram aesthetic. Match the brief's place — tropical only when asked. Not suburban street, not neighborhood houses, not parked cars, not power lines, not oversized fake palms. ${LEVEL_CAMERA_HINT} No watermark, no stock watermark, no dreamstime, no getty, no shutterstock text, no text overlay.`;

export const ANTI_WATERMARK_SUFFIX =
  " No watermark, no stock photo watermark, no dreamstime, no getty, no shutterstock, no text in image.";

export const SCENIC_COMPOSE_BLOCK = `
SCENIC BRIEF: Travel/lifestyle imagery for Posterboy — aspirational, polished, vivid. When the owner names a nature subject without a place (e.g. "a palm tree"), place it on a pristine tropical beach with white sand, turquoise water, blue sky, and horizon. NEVER suburban streets, neighborhoods, sidewalks, parked cars, houses, power lines, or urban grit unless explicitly requested. Palms must be natural proportion on a beach, not oversized CGI trees on a city block.`;

export function photoDirectionForBrief(brief: string): string {
  return isScenicBrief(brief) ? SCENIC_PHOTO_DIRECTION : REAL_PHOTO_DEFAULT_DIRECTION;
}

export function composeSuffixForBrief(brief: string, styleDirected: boolean): string {
  if (styleDirected) {
    return ` A real photograph with true-to-life detail and textures, no CGI or 3D-render look.${ANTI_WATERMARK_SUFFIX}`;
  }
  return isScenicBrief(brief) ? SCENIC_COMPOSE_SUFFIX : REAL_PHOTO_COMPOSE_SUFFIX;
}

export function generationSuffixForBrief(
  brief: string,
  hasReference: boolean,
  designLane = false,
): string {
  if (designLane) return "";
  if (hasReference && isListingBrief(brief)) return LISTING_REFERENCE_GENERATION_SUFFIX;
  if (hasReference) return REAL_PHOTO_REFERENCE_SUFFIX;
  // Scenic keeps the longer anti-urban + watermark block; commercial already
  // carries a short no-text/watermark line in REAL_PHOTO_GENERATION_SUFFIX.
  if (isScenicBrief(brief)) return SCENIC_GENERATION_SUFFIX + ANTI_WATERMARK_SUFFIX;
  return REAL_PHOTO_GENERATION_SUFFIX;
}
