import Anthropic from "@anthropic-ai/sdk";

// Hidden "art director" step for the studio. The user types a short brief
// ("fall promo", "make an instagram post about cold brew"); this expands it
// into one vivid, art-directed image prompt before the image model runs.
// Invisible to the user — there is no UI for it. On ANY failure it returns the
// original brief unchanged so image generation never blocks on this step.

const ART_DIRECTOR_SYSTEM = `You are an art director for a small local business's social media. Turn a short content brief into ONE vivid, specific image-generation prompt for a text-to-image model.

Return ONLY the prompt text — no preamble, no quotes, no explanation, no options, no markdown.

Write a single dense paragraph (40–80 words) that specifies:
- Subject & setting grounded in the brief (and the business type, if given).
- Composition & framing (close-up, three-quarter, overhead, rule-of-thirds, room for the eye to rest).
- Lighting & mood (natural window light, golden hour, soft diffused, bright & airy, moody — pick what fits).
- Lens/realism cues (shallow depth of field, photographic, true-to-life textures).
- A color palette that suits the brief.

Hard rules:
- Photographic and real by default — NOT illustration, NOT 3D render, NOT generic stock-photo blandness.
- NO text, words, letters, logos, watermarks, signage, or UI in the image — text is added later and models render it badly.
- NEVER invent brand names or proper nouns the brief didn't give — keep specifics real but unnamed ("a pilsner on a worn oak bar", not a made-up brewery).
- Keep every concrete detail the owner specified; never contradict the brief.
- One coherent scene. No collage, no split panels, no borders.`;

export async function expandImageBrief(opts: {
  brief: string;
  aspectRatio?: string;
  businessType?: string;
}): Promise<string> {
  const { brief, aspectRatio, businessType } = opts;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return brief;

  try {
    const client = new Anthropic({ apiKey: key, timeout: 9_000, maxRetries: 1 });
    const user = [
      businessType ? `Business: ${businessType}` : null,
      aspectRatio ? `Aspect ratio: ${aspectRatio}` : null,
      `Brief: ${brief}`,
    ]
      .filter(Boolean)
      .join("\n");

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6", // same id the rest of the app uses
      max_tokens: 320,
      system: ART_DIRECTOR_SYSTEM,
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
