/**
 * Lightweight Open Graph / HTML meta parse for Studio website previews.
 * No cheerio dependency — regex over capped HTML is enough for og:image.
 */

export type OpenGraphMeta = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/gi, (_, d) => String.fromCodePoint(Number(d)));
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const m = tag.match(re);
  if (!m) return null;
  const v = m[1] ?? m[2] ?? m[3] ?? "";
  return decodeBasicEntities(v.trim()) || null;
}

function metaContent(html: string, propertyOrName: string): string | null {
  const re = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const content = attr(m[0], "content");
    if (content) return content;
  }
  // content-before-property order
  const re2 = new RegExp(
    `<meta\\b[^>]*content\\s*=\\s*(?:"([^"]*)"|'([^']*)')[^>]*(?:property|name)\\s*=\\s*["']${propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "gi",
  );
  const m2 = re2.exec(html);
  if (m2) {
    const content = decodeBasicEntities((m2[1] ?? m2[2] ?? "").trim());
    if (content) return content;
  }
  return null;
}

function linkHref(html: string, rel: string): string | null {
  const re = new RegExp(
    `<link\\b[^>]*rel\\s*=\\s*["'][^"']*\\b${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[^"']*["'][^>]*>`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = attr(m[0], "href");
    if (href) return href;
  }
  return null;
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>\s*([\s\S]*?)\s*<\/title>/i);
  if (!m) return null;
  const t = decodeBasicEntities(m[1].replace(/\s+/g, " ").trim());
  return t || null;
}

/** Resolve relative / protocol-relative asset URLs against the page URL. */
export function resolvePageAssetUrl(pageUrl: string, asset: string | null | undefined): string | null {
  if (!asset) return null;
  const cleaned = asset.trim();
  if (!cleaned) return null;
  try {
    const absolute = new URL(cleaned, pageUrl).toString();
    if (!/^https?:\/\//i.test(absolute)) return null;
    return absolute.replace(/^http:\/\//i, "https://");
  } catch {
    return null;
  }
}

export function parseOpenGraphHtml(html: string, pageUrl: string): OpenGraphMeta {
  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    titleTag(html);

  const description =
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description") ||
    metaContent(html, "description");

  const siteName = metaContent(html, "og:site_name");

  const rawImage =
    metaContent(html, "og:image") ||
    metaContent(html, "og:image:url") ||
    metaContent(html, "twitter:image") ||
    metaContent(html, "twitter:image:src") ||
    linkHref(html, "apple-touch-icon") ||
    linkHref(html, "apple-touch-icon-precomposed") ||
    linkHref(html, "icon");

  return {
    title: title ? title.slice(0, 200) : null,
    description: description ? description.slice(0, 400) : null,
    imageUrl: resolvePageAssetUrl(pageUrl, rawImage),
    siteName: siteName ? siteName.slice(0, 120) : null,
  };
}

/**
 * Readable body text for the deep site read: strip scripts/styles/tags,
 * collapse whitespace, cap. Regex-over-HTML is fine here — this feeds a
 * model, not a parser.
 */
export function extractReadableText(html: string, maxChars = 6000): string {
  const cleaned = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeBasicEntities(cleaned).replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export type PageImageCandidate = { url: string; alt: string };

const IMG_SKIP_RE = /(\.svg($|\?)|favicon|sprite|pixel|tracking|spacer|blank\.|logo-?strip|1x1)/i;

/**
 * Candidate content images from the page (absolute https), with alt text so a
 * model can pick the actual product/hero shot instead of the og banner.
 */
export function extractImageCandidates(
  html: string,
  pageUrl: string,
  max = 15,
): PageImageCandidate[] {
  const out: PageImageCandidate[] = [];
  const seen = new Set<string>();
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const tag = m[0];
    const src =
      attr(tag, "src") ||
      (attr(tag, "srcset") || "").split(",")[0]?.trim().split(/\s+/)[0] ||
      attr(tag, "data-src");
    const resolved = resolvePageAssetUrl(pageUrl, src);
    if (!resolved || seen.has(resolved)) continue;
    if (resolved.startsWith("data:")) continue;
    if (IMG_SKIP_RE.test(resolved)) continue;
    seen.add(resolved);
    out.push({ url: resolved, alt: (attr(tag, "alt") || "").slice(0, 120) });
  }
  return out;
}

/** Append site brand cues to the owner's intent for compose/generate. */
export function enrichIntentWithSiteContext(
  intent: string,
  meta: OpenGraphMeta & { url: string },
): string {
  const base = intent.trim();
  const host = (() => {
    try {
      return new URL(meta.url).hostname.replace(/^www\./, "");
    } catch {
      return meta.url;
    }
  })();
  const label = meta.siteName || meta.title || host;
  // Image instruction BEFORE the (possibly fact-rich) description so the 980
  // cap truncates facts, never the reference instruction.
  const bits = [
    `Website brand reference: ${label} (${meta.url}).`,
    meta.imageUrl
      ? "Use the attached website image as brand/visual reference — match colors, mood, and subject matter; scale it into a social-ready photograph. Do not invent a different brand."
      : "Match this business's brand from the site context; create a social-ready photograph (no website screenshot mockup unless asked).",
    meta.description ? `About: ${meta.description}` : null,
  ].filter(Boolean);

  const suffix = bits.join(" ");
  const combined = `${base}\n\n${suffix}`.trim();
  // Compose intent max is 1000 — keep headroom.
  return combined.length > 980 ? combined.slice(0, 980) : combined;
}
