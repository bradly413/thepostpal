/** Shared direction for Studio compose + art-director + Gemini.
 *  Keep this SHORT — long ban lists taught Gemini to ignore everything. */

/** Keeps Gemini from defaulting to dutch tilts. */
export const LEVEL_CAMERA_HINT =
  "Eye-level, level camera — not dutch angle unless asked.";

/**
 * Tiny default look. Prefer positives over FORBIDDEN novels.
 */
export const CLEAN_COMMERCIAL_GRADE =
  "Bright, clean, vivid commercial photo — punchy true color, polished Instagram ad energy.";

/**
 * Stop Gemini "finishing" the shot with unrequested garnish / props
 * (fruit pile on a plain smoothie, etc.).
 */
export const BRIEF_FIDELITY_HINT =
  "Show only what the brief names — no invented garnish, toppings, fruit piles, props, or side dishes.";

/** @deprecated Kept as empty — set locks lived here; they over-constrained Gemini. */
export const STUDIO_SET_PREAMBLE = "";

/**
 * Soft venue hint only — do not expand into a ban encyclopedia.
 */
export const NO_VENUE_STAGING =
  "If no place is named, keep the subject on a simple seamless or solid-color backdrop — not a busy invented room.";

/**
 * Default look for business social — short on purpose.
 */
export const REAL_PHOTO_DEFAULT_DIRECTION = `a vivid scroll-stopping commercial photograph for Instagram. ${LEVEL_CAMERA_HINT} ${CLEAN_COMMERCIAL_GRADE} ${BRIEF_FIDELITY_HINT} Real photograph — not CGI, not illustration, no text or watermark in the image.`;

/** Appended to every Gemini image request (non-reference edits). */
export const REAL_PHOTO_GENERATION_SUFFIX =
  ` Real photograph, vivid clean color, bright light. ${LEVEL_CAMERA_HINT} ${BRIEF_FIDELITY_HINT} No CGI, no text or watermark in the image.`;

/** Appended to compose imagePrompt when styleDirected is false. */
export const REAL_PHOTO_COMPOSE_SUFFIX =
  ` Real photograph, vivid clean color, bright light — no dutch angle. ${BRIEF_FIDELITY_HINT} No CGI, no text or watermark.`;

/** True when compose (or a prior pass) already art-directed the prompt — skip a second expand. */
export function looksStudioComposed(prompt: string): boolean {
  const t = prompt.trim();
  if (!t) return false;
  if (t.includes("Vibrant social-ready")) return true;
  if (t.includes("Believable natural photo")) return true; // legacy compose suffix
  if (t.includes("Wide aspirational scenic shot")) return true;
  if (t.includes("A real photograph with true-to-life detail")) return true;
  if (t.includes("Real photograph, vivid clean color")) return true;
  if (t.includes("FORBIDDEN unless the brief names that place")) return true; // legacy
  return false;
}

/** Quality retry: lift exposure without rewriting the whole brief. */
export const REAL_PHOTO_EXPOSURE_RETRY_SUFFIX =
  " Brighter exposure, cleaner color, still a real photograph.";

/**
 * Director-approved text-on-image (promos/offers): typography is part of the
 * design — so no "no text" clause, but spelling accuracy is non-negotiable.
 */
export const TEXT_ON_IMAGE_SUFFIX =
  " Photographic scene with clean designed typography — render the quoted words large, crisp, and CORRECTLY SPELLED, exactly as given; no other words, no watermark. Vivid clean color, bright light, level camera.";

/** When editing from a reference image — preserve subject, keep energy. */
export const REAL_PHOTO_REFERENCE_SUFFIX =
  " Preserve the subject. Keep vivid clean photographic quality. No CGI, no text or watermark.";

// Back-compat aliases used across the codebase
export const VIVID_DEFAULT_IMAGE_DIRECTION = REAL_PHOTO_DEFAULT_DIRECTION;
export const VIVID_GENERATION_SUFFIX = REAL_PHOTO_GENERATION_SUFFIX;
export const VIVID_COMPOSE_SUFFIX = REAL_PHOTO_COMPOSE_SUFFIX;
