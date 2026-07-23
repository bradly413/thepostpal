import Anthropic from "@anthropic-ai/sdk";
import {
  isScenicBrief,
  photoDirectionForBrief,
  scenicSettingForBrief,
} from "@/lib/studio/scene-intent";
import { verticalAestheticBlock } from "@/lib/studio/vertical-aesthetics";

// Hidden "art director" step for the studio. The user types a short brief
// ("fall promo", "make an instagram post about cold brew"); this expands it
// into one vivid, art-directed image prompt before the image model runs.
// Invisible to the user — there is no UI for it. On ANY failure it returns the
// original brief unchanged so image generation never blocks on this step.

const ART_DIRECTOR_BUSINESS_SYSTEM = `You are an art director for local-business Instagram. Turn a short content brief into ONE vivid, post-worthy image-generation prompt for a text-to-image model.

Return ONLY the prompt text — no preamble, no quotes, no explanation, no options, no markdown.

Write a single dense paragraph (40–90 words) that specifies:
- The HERO subject named in the brief first (product, food, drink, skin, beauty, person) — large and scroll-stopping in frame.
- Setting: ONLY if the brief names a place/venue. Otherwise you MUST describe an isolated commercial shot on a seamless paper backdrop or flat solid-color fill matching the brief (e.g. red smoothie → solid red or pure white seamless; med spa / beauty → soft white or ivory seamless). Explicitly say "seamless backdrop" or "solid color background" in the prompt.
- NEVER write restaurant, cafe, bakery, table, marble, countertop, brick wall, kraft paper, rustic ceramic, dining room, kitchen, patio, waterfront, skyline, Gateway Arch, or any tourist landmark unless those words appear in the brief. No table of any material. No local monuments. No cozy café lifestyle filler.
- If a "Business:" line is present, that is niche context ONLY — it is NOT permission to invent that business's interior as the set (especially not a café when the brief is beauty, wellness, or product).
- Honor the Vertical aesthetic block in the user message (industry look) without dulling vibrancy or inventing venues.
- Composition: confident eye-level framing, level horizon — not dutch angle unless asked.
- Lighting & grade: bright, clean, high-key commercial beauty — soft white / ivory / pearl. NEVER rustic brown, sepia, muddy earth tones, warm dim café tungsten, or documentary-muted.
- Color: vibrant and saturated like a great Instagram ad — honor color words in the brief.
- Include one lens mm/aperture cue and one concrete light cue.
- Textures that make the subject look premium and fresh.

- Default photographic look (unless the brief directs otherwise): see Photography direction in the user message.

Hard rules:
- Must read as a photograph — NOT illustration, NOT 3D render, NOT cartoon.
- NO text, words, letters, logos, watermarks, signage, or UI in the image.
- NEVER invent brand names or proper nouns the brief didn't give.
- Product-forward, beauty, and med-spa briefs stay clean commercial — no lifestyle venue filler.
- BRAND HERO: if the brief is "create an image for [business]" / a spa or clinic name without naming a product, feature a person (radiant skin / confident client portrait) on white/ivory seamless — NEVER invent skincare bottles, serum droppers, product flat-lays, or unlabeled packaging.
- REAL PROPERTY RULE: if the brief is about a specific property/listing/address, never invent the building — the owner must attach their photo.
- If brand visual direction is provided, honor it without dulling the energy or forcing a café/wood set.
- If geography is provided, match region — never tropical/coastal unless asked. Never invent famous local landmarks unless named.
- Keep every concrete detail the owner specified; never contradict the brief.
- One coherent scene. No collage, no split panels, no borders.`;

const ART_DIRECTOR_SCENIC_SYSTEM = `You are an art director for aspirational travel and lifestyle Instagram content. Turn a short nature/travel brief into ONE vivid image-generation prompt for a text-to-image model.

Return ONLY the prompt text — no preamble, no quotes, no explanation, no options, no markdown.

Write a single dense paragraph (40–90 words) that specifies:
- Subject in a beautiful natural setting. Prefer the place implied by the brief or geography. Only use pristine tropical beach (white sand, turquoise water) when the brief explicitly names palms, beaches, tropical, or coastal — never as a default for every nature word.
- Composition: wide scenic establishing shot, level horizon, full environment visible when applicable.
- Lighting: bright natural daylight, vivid but believable colors, well-exposed.
- Camera: professional travel photography — natural proportions, no dutch angle, no dramatic tilt.

- Default photographic look: see Photography direction in the user message.

Hard rules:
- Aspirational Instagram travel aesthetic — polished, inviting, like a real vacation photo on a premium social account.
- NEVER suburban neighborhoods, city streets, sidewalks, parked cars, houses, apartment blocks, power lines, chain-link fences, or urban grit unless the brief explicitly requests them.
- If geography is provided, match that region — do not force Caribbean tropics onto inland or Midwestern locations.
- Palms must be natural proportion on a beach or tropical coast — NOT oversized CGI trees planted on a city block.
- Must read as a photograph — NOT illustration, NOT 3D render, NOT AI gloss.
- NO text, words, letters, logos, watermarks, or signage in the image.
- Keep every concrete detail the owner specified; never contradict the brief.
- One coherent scene. No collage, no split panels, no borders.`;

export async function expandImageBrief(opts: {
  brief: string;
  aspectRatio?: string;
  businessType?: string;
  /** Compact visual brand direction (photography style, palette accents). */
  brandContext?: string;
  /** City/region so scenes match the tenant's market. */
  geography?: string;
}): Promise<string> {
  const { brief, aspectRatio, businessType, brandContext, geography } = opts;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return brief;

  const scenic = isScenicBrief(brief);
  const defaultSetting = scenic ? scenicSettingForBrief(brief) : null;

  try {
    const client = new Anthropic({ apiKey: key, timeout: 9_000, maxRetries: 1 });
    const user = [
      businessType && !scenic ? `Business: ${businessType}` : null,
      aspectRatio ? `Aspect ratio: ${aspectRatio}` : null,
      geography ? `Geography (match architecture, vegetation, light): ${geography}` : null,
      brandContext ? `Brand visual direction (honor this):\n${brandContext}` : null,
      !scenic ? `Vertical aesthetic:\n${verticalAestheticBlock(brief, businessType)}` : null,
      `Photography direction: ${photoDirectionForBrief(brief)}`,
      defaultSetting ? `Default setting (use unless the brief or geography contradicts): ${defaultSetting}` : null,
      `Brief: ${brief}`,
    ]
      .filter(Boolean)
      .join("\n");

    const resp = await client.messages.create({
      model: "claude-sonnet-5", // same id the rest of the app uses
      max_tokens: 320,
      system: scenic ? ART_DIRECTOR_SCENIC_SYSTEM : ART_DIRECTOR_BUSINESS_SYSTEM,
      messages: [{ role: "user", content: user }],
    });

    const text = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
    // Sanity-gate the expansion; otherwise keep the user's original brief.
    if (text.length < 20 || text.length > 1500) return brief;
    return text;
  } catch {
    return brief; // never block generation on the art-director step
  }
}
