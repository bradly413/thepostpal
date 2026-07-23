import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import {
  isScenicBrief,
  photoDirectionForBrief,
  scenicSettingForBrief,
} from "@/lib/studio/scene-intent";
import { verticalAestheticBlock } from "@/lib/studio/vertical-aesthetics";
import { extractMessageText } from "@/lib/ai/message-text";

/**
 * Studio Director — the single Claude turn that replaces the regex routing
 * matrix for generation prompts. One call classifies the ask (platform,
 * format, text-on-image) AND art-directs the final image prompt with brand
 * context, so the first generation already looks like this business.
 *
 * The old regex router (needsComposeRewrite → /api/studio/compose) stays as
 * the client-side fallback whenever this fails — the Director must never be
 * a single point of failure for generation.
 */

export const DIRECTOR_PLATFORMS = ["instagram", "facebook", "x", "tiktok", "linkedin"] as const;
export type DirectorPlatform = (typeof DIRECTOR_PLATFORMS)[number];

export type DirectorDecision = {
  platform: DirectorPlatform;
  /** "design" routes to the GPT layout engine (ads, promos, product posts). */
  lane: "photo" | "design";
  format: "single" | "carousel";
  /** Requested slide count when format=carousel (2–5). Generation is still
   *  slide 1 in this phase — the plan rides along for the carousel build. */
  slides?: number;
  /** Final art-directed image prompt (suffix NOT yet applied). */
  imagePrompt: string;
  /** True when the post should carry designed words ON the image (promo/offer). */
  allowText: boolean;
  /** Exact words to render when allowText — short, verbatim. */
  overlayText?: string;
  /** One short question when generation would likely be WRONG without an
   *  answer. When set, the caller must NOT generate. */
  clarify?: string;
  /** User named a photographic look — softer suffix. */
  styleDirected: boolean;
};

const SYSTEM_BASE = `You are the creative director for a local business's social media studio. One user message arrives; you return ONE JSON object that routes and art-directs it. No markdown, no prose — JSON only.

{
  "platform": "instagram" | "facebook" | "x" | "tiktok" | "linkedin",   // named or implied; default instagram
  "lane": "photo" | "design",                   // design = a DESIGNED GRAPHIC is the right deliverable: product ads, promos, launches, offers, flyers, brand lockup energy. photo = scene/food/portrait photography is the deliverable.
  "format": "single" | "carousel",              // carousel ONLY if they ask for one / multiple slides
  "slides": 3,                                   // when carousel: 2–5
  "allowText": false,                            // true ONLY for promo/offer/announcement asks where words belong ON the image (a price, date, offer, or short slogan)
  "overlayText": "FRIDAY: $5 OFF",              // when allowText: the exact short words, verbatim from the brief — never invent prices/dates
  "styleDirected": false,                        // true only if they named a photographic look (cinematic, moody, studio…)
  "clarify": null,                               // see CLARIFY rules
  "imagePrompt": "…"                             // see IMAGE PROMPT rules
}

CLARIFY rules — ask at most ONE short question, and ONLY when generating without the answer would likely produce the WRONG post (a missing product name where the business sells many unrelated things, an event with no stated subject, contradictory instructions). NEVER clarify style, color, or composition — decide those confidently. NEVER clarify when a sensible default exists. When clarify is set, imagePrompt may be "".

IMAGE PROMPT rules — one dense paragraph, 40–90 words:
- HERO subject named in the brief first — large, scroll-stopping.
- Setting: only if the brief names a place. Otherwise an isolated commercial shot on a seamless backdrop or flat solid-color fill matching the brief; say "seamless backdrop" or "solid color background" explicitly.
- NEVER invent venues (restaurant, café, marble counter, brick wall…), landmarks, or brand names the brief didn't give.
- Honor the Vertical aesthetic and Brand visual direction blocks without dulling vibrancy.
- Composition: confident eye-level framing, level horizon. Lighting: bright, clean, high-key commercial. Color: vibrant, saturated, honoring color words in the brief. One lens mm/aperture cue + one concrete light cue.
- Must read as a photograph — not illustration, not 3D, not CGI.
- allowText=false → NO words, letters, logos, or signage in the image.
- allowText=true → include the typography as part of the art direction: overlayText rendered large and clean (placement + treatment), correctly spelled, exactly as quoted — nothing else written anywhere.
- lane=design → art-direct a full layout (headline treatment, product placement, accent color, clean composition); product-ad asks default to lane=design with the product name as overlayText.
- BRAND HERO: a business/brand ask with no named product → feature a person (radiant client portrait) on white/ivory seamless — never invent unlabeled product bottles.
- REAL PROPERTY: a specific listing/address must never be invented — the owner attaches their photo (a separate gate handles this; do not clarify for it).
- Keep every concrete detail the owner specified; never contradict the brief.
- Carousel: imagePrompt is slide 1 — the strongest hero that can lead the set.`;

/** Robust JSON extraction from a possibly chatty model reply. */
export function parseDirectorDecision(text: string): DirectorDecision | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const platform = DIRECTOR_PLATFORMS.includes(raw.platform as DirectorPlatform)
      ? (raw.platform as DirectorPlatform)
      : "instagram";
    const clarify =
      typeof raw.clarify === "string" && raw.clarify.trim() ? raw.clarify.trim().slice(0, 200) : undefined;
    const imagePrompt = typeof raw.imagePrompt === "string" ? raw.imagePrompt.trim() : "";
    if (!clarify && (imagePrompt.length < 20 || imagePrompt.length > 1500)) return null;
    const lane = raw.lane === "design" ? "design" : "photo";
    const format = raw.format === "carousel" ? "carousel" : "single";
    const slidesNum = Number(raw.slides);
    const overlayText =
      typeof raw.overlayText === "string" && raw.overlayText.trim()
        ? raw.overlayText.trim().slice(0, 120)
        : undefined;
    return {
      platform,
      lane,
      format,
      ...(format === "carousel"
        ? { slides: Math.min(5, Math.max(2, Number.isFinite(slidesNum) ? Math.round(slidesNum) : 3)) }
        : {}),
      imagePrompt,
      allowText: raw.allowText === true && !!overlayText,
      ...(overlayText ? { overlayText } : {}),
      ...(clarify ? { clarify } : {}),
      styleDirected: raw.styleDirected === true,
    };
  } catch {
    return null;
  }
}

export async function runDirector(opts: {
  intent: string;
  businessType?: string;
  /** Compact visual brand direction (photography style, palette accents). */
  brandContext?: string;
  /** "City, ST" so scenes match the tenant's market. */
  geography?: string;
  /** Previous generation prompt — light thread continuity. */
  lastGenPrompt?: string;
  hasReferenceImage?: boolean;
  /** User picked the Design Studio engine — favor a designed layout. */
  designLane?: boolean;
}): Promise<DirectorDecision | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const scenic = isScenicBrief(opts.intent);
  const defaultSetting = scenic ? scenicSettingForBrief(opts.intent) : null;

  const user = [
    opts.businessType ? `Business: ${opts.businessType}` : null,
    opts.geography ? `Geography (match architecture, vegetation, light): ${opts.geography}` : null,
    opts.brandContext ? `Brand visual direction (honor this):\n${opts.brandContext}` : null,
    !scenic ? `Vertical aesthetic:\n${verticalAestheticBlock(opts.intent, opts.businessType)}` : null,
    `Photography direction: ${photoDirectionForBrief(opts.intent)}`,
    defaultSetting
      ? `Default setting (use unless the brief or geography contradicts): ${defaultSetting}`
      : null,
    opts.hasReferenceImage
      ? `A reference photo IS attached — the prompt should direct an edit/staging of it, keeping its subject identical.`
      : null,
    opts.designLane
      ? `The owner selected the DESIGN engine: treat this as a designed social graphic. Prefer allowText=true with the brief's key words as overlayText, and art-direct a full layout (headline placement, accent color, clean composition) — not a plain photo.`
      : null,
    opts.lastGenPrompt ? `Previous post's image prompt (continuity context only): ${opts.lastGenPrompt.slice(0, 400)}` : null,
    `Brief: ${opts.intent}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic({ apiKey: key, timeout: 12_000, maxRetries: 1 });
    const resp = await client.messages.create({
      model: "claude-sonnet-5",
      // Structured/routing call — reasoning would only add latency + budget risk.
      thinking: { type: "disabled" },
      max_tokens: 900,
      system: SYSTEM_BASE,
      messages: [{ role: "user", content: user }],
    });
    const text = extractMessageText(resp.content);
    return parseDirectorDecision(text);
  } catch {
    return null; // caller falls back to the legacy compose path
  }
}
