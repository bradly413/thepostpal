/** Shared real-photo direction for Studio compose + art-director + Gemini. */

/** Keeps Gemini from defaulting to dutch tilts and trunk-filling diagonals. */
export const LEVEL_CAMERA_HINT =
  "Eye-level camera, level and straight — not dutch angle, not dramatic tilt, not extreme low-angle or worm's-eye view unless the brief explicitly requests it.";

/**
 * Default look: vivid like hero-ring editorial, but believably human — not
 * stock-catalog polish or AI gloss.
 */
export const REAL_PHOTO_DEFAULT_DIRECTION = `a believable photograph a real local business would actually post today — natural, shot on a modern phone or 35mm in their real space. Natural warm light, true colors, well-exposed but not studio-perfect. ${LEVEL_CAMERA_HINT} Gentle real-world imperfection is fine: slight grain, worn surfaces, lived-in detail. Should feel like a capable human took it for Instagram — NOT AI-generated, NOT CGI, NOT 3D render, NOT glossy stock catalog, NOT over-smoothed, NOT uncanny symmetry, NOT surreal perfection.`;

/** Appended to every Gemini image request (non-reference edits). */
export const REAL_PHOTO_GENERATION_SUFFIX =
  ` Authentic photograph from a real camera. Natural textures, ${LEVEL_CAMERA_HINT} No AI look, no CGI, no 3D render, no stock photo polish, no plastic skin, no oversaturated HDR, no fake bokeh, no floating objects, no symmetry perfection, no text or watermark.`;

/** Appended to compose imagePrompt when styleDirected is false. */
export const REAL_PHOTO_COMPOSE_SUFFIX =
  " Believable natural photo, eye-level framing, level horizon, real textures — not AI, not CGI, not stock polish, no dutch angle, no text or watermark.";

/** Quality retry: lift exposure without pushing stock/AI gloss. */
export const REAL_PHOTO_EXPOSURE_RETRY_SUFFIX =
  " Slightly brighter natural daylight, well-exposed. Keep authentic documentary realism — not stock, not CGI, not over-processed.";

/** When editing from a reference image — preserve realism. */
export const REAL_PHOTO_REFERENCE_SUFFIX =
  " Preserve photographic realism and natural textures. No AI gloss, no CGI, no stock polish, no text or watermark.";

// Back-compat aliases used across the codebase
export const VIVID_DEFAULT_IMAGE_DIRECTION = REAL_PHOTO_DEFAULT_DIRECTION;
export const VIVID_GENERATION_SUFFIX = REAL_PHOTO_GENERATION_SUFFIX;
export const VIVID_COMPOSE_SUFFIX = REAL_PHOTO_COMPOSE_SUFFIX;
