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
  /\b(our|my|at\s+the|restaurant|store|shop|office|salon|cafe|bar|gym|studio|business|neighborhood|street|city|downtown|home|house|building|storefront|patio|lobby|interior|kitchen|menu|staff|team|customer|client|property|listing|open\s+house)\b/i;

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
export const SCENIC_PHOTO_DIRECTION = `aspirational travel and lifestyle photography for a polished Instagram post — vivid, inviting, beautiful like a real vacation photo, not documentary urban grit. Wide establishing shot with the FULL scene in frame: sky, horizon, and environment visible. Level camera, natural proportions. When the brief names a nature subject without a specific place (palm tree, beach, sunset), default to a pristine tropical beach with white sand, turquoise water, and blue sky — NEVER a suburban street, neighborhood, sidewalk, parked cars, houses, or power lines unless the brief explicitly asks. ${LEVEL_CAMERA_HINT} NOT an extreme close-up, NOT oversized CGI props, NOT illustration, NOT 3D render.`;

export const SCENIC_COMPOSE_SUFFIX =
  " Wide aspirational scenic shot, tropical beach or natural vista when appropriate, level horizon, vivid travel photography — not suburban street, not urban neighborhood, not extreme close-up, no watermark, no dreamstime, no text.";

export const SCENIC_GENERATION_SUFFIX =
  ` Wide establishing travel photograph with sky and horizon visible. Level camera, natural proportions, aspirational Instagram aesthetic. Pristine natural setting — not suburban street, not neighborhood houses, not parked cars, not power lines, not oversized fake palms. ${LEVEL_CAMERA_HINT} No watermark, no stock watermark, no dreamstime, no getty, no shutterstock text, no text overlay.`;

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

export function generationSuffixForBrief(brief: string, hasReference: boolean): string {
  if (hasReference && isListingBrief(brief)) return LISTING_REFERENCE_GENERATION_SUFFIX;
  if (hasReference) return REAL_PHOTO_REFERENCE_SUFFIX;
  const base = isScenicBrief(brief) ? SCENIC_GENERATION_SUFFIX : REAL_PHOTO_GENERATION_SUFFIX;
  return base + ANTI_WATERMARK_SUFFIX;
}
