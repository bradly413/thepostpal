/**
 * Detect https image (or image-like) URLs pasted into Studio prompts.
 * Used to attach reference photos from listing / MLS / CDN links.
 * Website pages (socelle.com, etc.) must NOT match — those go through page-url.ts.
 */

const URL_RE = /https:\/\/[^\s<>"'`]+/gi;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|heic|heif)(\?|#|$)/i;

/** Strip trailing punctuation commonly glued onto pasted URLs. */
function cleanUrl(raw: string): string {
  return raw.replace(/[),.;:!?\]]+$/g, "");
}

/**
 * True only for URLs that are clearly direct image assets — not marketing pages.
 */
export function looksLikeDirectImageUrl(url: string): boolean {
  const u = cleanUrl(url.trim());
  if (!/^https:\/\//i.test(u)) return false;
  if (IMAGE_EXT_RE.test(u)) return true;

  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname;

    // Bare domain or homepage — never an image attach
    if (path === "/" || path === "") return false;

    // Known photo CDNs
    if (
      /zillowstatic|imgix\.net|cloudinary\.com|images\.unsplash|imagedelivery\.net|googleusercontent\.com/i.test(
        host,
      )
    ) {
      return true;
    }
    // Our CloudFront uploads / media paths without an extension
    if (
      /cloudfront\.net$/i.test(host) &&
      /\/(uploads?|media|photos?|images?|fp)\//i.test(path)
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Prefer URLs that look like images. Never returns a generic website page URL.
 */
export function extractReferenceImageUrl(text: string): string | null {
  const matches = text.match(URL_RE);
  if (!matches?.length) return null;

  const cleaned = matches.map(cleanUrl);
  const withExt = cleaned.find((u) => IMAGE_EXT_RE.test(u));
  if (withExt) return withExt;

  const imageLike = cleaned.find((u) => looksLikeDirectImageUrl(u));
  return imageLike || null;
}

/** Entire trimmed text is a single direct image URL (safe to attach-only). */
export function looksLikeStandaloneImageUrl(text: string): boolean {
  const t = text.trim();
  if (!/^https:\/\//i.test(t)) return false;
  const cleaned = cleanUrl(t);
  return looksLikeDirectImageUrl(cleaned) && cleaned === cleanUrl(t);
}
