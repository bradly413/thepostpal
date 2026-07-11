import Anthropic from "@anthropic-ai/sdk";
import {
  isScenicBrief,
  photoDirectionForBrief,
  scenicSettingForBrief,
} from "@/lib/studio/scene-intent";

// Hidden "art director" step for the studio. The user types a short brief
// ("fall promo", "make an instagram post about cold brew"); this expands it
// into one vivid, art-directed image prompt before the image model runs.
// Invisible to the user — there is no UI for it. On ANY failure it returns the
// original brief unchanged so image generation never blocks on this step.

const ART_DIRECTOR_BUSINESS_SYSTEM = `You are an art director for a small local business's social media. Turn a short content brief into ONE specific, believable image-generation prompt for a text-to-image model.

Return ONLY the prompt text — no preamble, no quotes, no explanation, no options, no markdown.

Write a single dense paragraph (40–90 words) that specifies:
- Subject & setting grounded in the brief — a REAL place with lived-in detail (wear, clutter, steam, crumbs, scuffs).
- Composition: natural eye-level framing with a level horizon — straightforward and balanced, not dutch angle, not dramatic tilt, not worm's-eye or extreme low-angle unless the brief asks.
- Lighting: natural window light or warm daylight, well-exposed, not studio strobes or cinematic noir.
- Camera: modern phone or 35mm documentary — shallow depth of field only if natural, never fake bokeh halos.
- Specific textures (worn oak, linen napkin, condensation on glass, flour dust).

- Default photographic look (unless the brief directs otherwise): see Photography direction in the user message.

Hard rules:
- Must read as a photograph a human took — NOT illustration, NOT 3D render, NOT stock-photo staging, NOT AI gloss.
- NO text, words, letters, logos, watermarks, signage, or UI in the image.
- NEVER invent brand names or proper nouns the brief didn't give — keep specifics real but unnamed ("a pilsner on a worn oak bar", not a made-up brewery).
- REAL PROPERTY RULE: if the brief is about a specific property, listing, address, or a home that sold, you CANNOT know what that property looks like — never depict an invented house/building or substitute generic keys-on-table lifestyle scenes. The owner must attach their listing photo.
- If brand visual direction is provided, honor its photography style and let the palette influence accents naturally.
- Keep every concrete detail the owner specified; never contradict the brief.
- One coherent scene. No collage, no split panels, no borders.`;

const ART_DIRECTOR_SCENIC_SYSTEM = `You are an art director for aspirational travel and lifestyle Instagram content. Turn a short nature/travel brief into ONE vivid image-generation prompt for a text-to-image model.

Return ONLY the prompt text — no preamble, no quotes, no explanation, no options, no markdown.

Write a single dense paragraph (40–90 words) that specifies:
- Subject in a beautiful natural setting — default to pristine tropical beach (white sand, turquoise water, blue sky, horizon) when the brief names palms, beaches, or nature without a specific urban place.
- Composition: wide scenic establishing shot, level horizon, full environment visible — sky, water, and sand all readable when applicable.
- Lighting: bright natural daylight, vivid but believable colors, well-exposed.
- Camera: professional travel photography — natural proportions, no dutch angle, no dramatic tilt.

- Default photographic look: see Photography direction in the user message.

Hard rules:
- Aspirational Instagram travel aesthetic — polished, inviting, like a real vacation photo on a premium social account.
- NEVER suburban neighborhoods, city streets, sidewalks, parked cars, houses, apartment blocks, power lines, chain-link fences, or urban grit unless the brief explicitly requests them.
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
}): Promise<string> {
  const { brief, aspectRatio, businessType, brandContext } = opts;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return brief;

  const scenic = isScenicBrief(brief);
  const defaultSetting = scenic ? scenicSettingForBrief(brief) : null;

  try {
    const client = new Anthropic({ apiKey: key, timeout: 9_000, maxRetries: 1 });
    const user = [
      businessType && !scenic ? `Business: ${businessType}` : null,
      aspectRatio ? `Aspect ratio: ${aspectRatio}` : null,
      brandContext ? `Brand visual direction (honor this):\n${brandContext}` : null,
      `Photography direction: ${photoDirectionForBrief(brief)}`,
      defaultSetting ? `Default setting (use unless the brief contradicts): ${defaultSetting}` : null,
      `Brief: ${brief}`,
    ]
      .filter(Boolean)
      .join("\n");

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6", // same id the rest of the app uses
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
