/**
 * Detect website / page URLs in Studio prompts (incl. bare domains like socelle.com).
 * Image CDN URLs stay in reference-url.ts — this is for brand/site pages.
 */

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|heic|heif)(\?|#|$)/i;

/** Full http(s) URLs in prose. */
const FULL_URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

/**
 * Bare domains: socelle.com, www.socelle.com — require a plausible TLD.
 * Avoid emails (has @) and version-like tokens.
 */
const BARE_DOMAIN_RE =
  /\b(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|co|ai|app|dev|shop|store|biz|info|us|uk|ca|au|edu|gov)\b/gi;

function stripTrailingPunct(raw: string): string {
  return raw.replace(/[),.;:!?\]]+$/g, "");
}

function isImageLikeUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url);
}

/** Normalize user-supplied site text to an absolute https URL. */
export function normalizeWebsiteUrl(raw: string): string | null {
  const cleaned = stripTrailingPunct(raw.trim());
  if (!cleaned || cleaned.includes("@")) return null;

  let candidate = cleaned;
  if (!/^https?:\/\//i.test(candidate)) {
    if (!/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    // Prefer https for public sites
    if (u.protocol === "http:") u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * First website/page URL in text. Prefers full URLs; falls back to bare domains.
 * Skips obvious direct image links (those are reference photos).
 */
export function extractWebsiteUrl(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const full = t.match(FULL_URL_RE) ?? [];
  for (const raw of full) {
    const cleaned = stripTrailingPunct(raw);
    if (isImageLikeUrl(cleaned)) continue;
    const normalized = normalizeWebsiteUrl(cleaned);
    if (normalized) return normalized;
  }

  // Don't treat hosts inside direct image URLs as website pages
  // (e.g. cdn.example.com/hero.jpg → not "cdn.example.com").
  const withoutImages = t.replace(FULL_URL_RE, (raw) =>
    isImageLikeUrl(stripTrailingPunct(raw)) ? " " : raw,
  );

  const bare = withoutImages.match(BARE_DOMAIN_RE) ?? [];
  for (const raw of bare) {
    const normalized = normalizeWebsiteUrl(raw);
    if (normalized) return normalized;
  }

  return null;
}

export function looksLikeWebsiteBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (extractWebsiteUrl(t)) return true;
  return /\b(for\s+(my|our|the)\s+website|my\s+website|our\s+website|our\s+site|my\s+site|here\s+is\s+the\s+link|from\s+(my|our)\s+(site|website))\b/i.test(
    t,
  );
}
