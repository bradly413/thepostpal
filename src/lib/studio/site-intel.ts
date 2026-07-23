import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { PageImageCandidate } from "@/lib/studio/open-graph";
import { extractMessageText } from "@/lib/ai/message-text";

/**
 * Deep site read for Studio URL pulls: a cheap Haiku turn reads the page's
 * actual text + image list and returns the facts worth posting and the image
 * that shows the real product/subject (instead of whatever og:image banner
 * the homepage happens to expose).
 *
 * Best-effort: returns null on any failure and the caller keeps the plain
 * OpenGraph result — the URL pull never gets slower-but-broken.
 */

export type SiteIntel = {
  facts: string[];
  bestImageUrl: string | null;
  brandName: string | null;
};

export function parseSiteIntel(text: string, allowedImageUrls: Set<string>): SiteIntel | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const facts = Array.isArray(raw.facts)
      ? raw.facts
          .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
          .map((f) => f.trim().slice(0, 110))
          .slice(0, 5)
      : [];
    const best =
      typeof raw.bestImageUrl === "string" && allowedImageUrls.has(raw.bestImageUrl.trim())
        ? raw.bestImageUrl.trim()
        : null;
    const brandName =
      typeof raw.brandName === "string" && raw.brandName.trim()
        ? raw.brandName.trim().slice(0, 80)
        : null;
    return { facts, bestImageUrl: best, brandName };
  } catch {
    return null;
  }
}

export async function readSiteIntel(opts: {
  url: string;
  title: string | null;
  description: string | null;
  bodyText: string;
  images: PageImageCandidate[];
}): Promise<SiteIntel | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!opts.bodyText && opts.images.length === 0) return null;

  const imageList = opts.images
    .map((img, i) => `${i + 1}. ${img.url}${img.alt ? ` — alt: "${img.alt}"` : ""}`)
    .join("\n");

  const user = [
    `Page: ${opts.url}`,
    opts.title ? `Title: ${opts.title}` : null,
    opts.description ? `Meta description: ${opts.description}` : null,
    opts.images.length ? `Images on the page:\n${imageList}` : "Images on the page: none found",
    `Page text (extracted):\n${opts.bodyText || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const system = `You read a business's web page so a social-post studio can brand-match it. Return ONLY JSON:
{
  "brandName": "the business/brand name" | null,
  "facts": ["up to 5 short factual claims VERBATIM-supported by the page text — offers, product benefits, hours, signature items. Never invent numbers, prices, or claims."],
  "bestImageUrl": "the ONE image URL most likely to show the actual product/subject of this page (product shot, hero photo, dish, storefront) — prefer real photos over logos, banners, icons, or lifestyle filler" | null
}
bestImageUrl MUST be copied exactly from the provided list, or null if none of them clearly shows the subject.`;

  try {
    const client = new Anthropic({ apiKey: key, timeout: 8_000, maxRetries: 1 });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = extractMessageText(resp.content);
    return parseSiteIntel(text, new Set(opts.images.map((i) => i.url)));
  } catch {
    return null;
  }
}
