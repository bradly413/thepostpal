/**
 * Detect https image (or image-like) URLs pasted into Studio prompts.
 * Used to attach reference photos from listing / MLS / CDN links.
 */

const URL_RE = /https:\/\/[^\s<>"'`]+/gi;

/** Strip trailing punctuation commonly glued onto pasted URLs. */
function cleanUrl(raw: string): string {
  return raw.replace(/[),.;:!?\]]+$/g, "");
}

/**
 * Prefer URLs that look like images; otherwise return the first https URL
 * (many CDNs omit file extensions).
 */
export function extractReferenceImageUrl(text: string): string | null {
  const matches = text.match(URL_RE);
  if (!matches?.length) return null;

  const cleaned = matches.map(cleanUrl);
  const withExt = cleaned.find((u) =>
    /\.(jpe?g|png|webp|gif|avif|heic|heif)(\?|#|$)/i.test(u),
  );
  if (withExt) return withExt;

  // Skip obvious non-image pages when another URL might exist
  const nonPage = cleaned.find(
    (u) => !/\.(html?|php|aspx?)(\?|#|$)/i.test(u) && !/[?&]utm_/i.test(u),
  );
  return nonPage || cleaned[0] || null;
}

export function looksLikeStandaloneImageUrl(text: string): boolean {
  const t = text.trim();
  if (!/^https:\/\//i.test(t)) return false;
  const only = extractReferenceImageUrl(t);
  return !!only && cleanUrl(t) === only;
}
