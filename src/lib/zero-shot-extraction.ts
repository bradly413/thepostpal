import { z } from "zod";

// Zero-shot brand extraction — reverse-engineer a brand's identity from their
// historical social captions (+ local hashtag/cadence/media stats).

export const zeroShotExtractionSchema = z.object({
  tone: z
    .string()
    .min(3)
    .max(120)
    .describe("3-4 punchy adjectives separated by periods, e.g. 'Confident. Elevated. Local.'"),
  pillars: z
    .array(z.string().min(2).max(40))
    .min(2)
    .max(4)
    .describe("The 3 core content buckets the brand posts about (1-3 words each)."),
  weSay: z
    .array(z.string().min(2).max(200))
    .min(3)
    .max(6)
    .describe("5 signature phrases, keywords, or stylistic word choices the brand uses."),
  weDontSay: z
    .array(z.string().min(2).max(200))
    .min(3)
    .max(6)
    .describe("5 phrases, cliché marketing terms, or tones this brand should never use."),
  visualStyle: z
    .array(z.string().min(2).max(60))
    .min(2)
    .max(5)
    .describe(
      "2-5 short visual descriptors inferred from captions + media mix (e.g. 'bright interiors', 'team candid', 'product close-ups'). Do not invent if evidence is thin — prefer concrete, cautious labels.",
    ),
});

export type ZeroShotExtraction = z.infer<typeof zeroShotExtractionSchema>;

/** Full onboarding history result: AI voice + locally computed signals. */
export interface ZeroShotHistoryResult extends ZeroShotExtraction {
  hashtags: string[];
  postingCadence: string;
  mediaMix: string;
}

export const ZERO_SHOT_EXTRACTION_PROMPT = `
You are an elite, enterprise-grade Brand Strategist and Linguistic Analyst. Your job is to analyze a raw dataset of a brand's historical social media captions (plus precomputed posting stats) and reverse-engineer their core brand identity into a strict data schema.

You will be provided with:
1. An array of the user's recent social media post captions (and media type labels when known).
2. Precomputed local stats: top hashtags, posting cadence, and media mix. Trust those stats — do not invent alternative frequencies or hashtag rankings.

Your objective is to extract the following data points with absolute precision:

1. TONE (String)
Identify the brand's voice. Provide exactly 3 to 4 punchy, descriptive adjectives separated by periods.
- Example for a luxury realtor: "Confident. Elevated. Local."
- Example for a casual restaurant: "Warm. Energetic. Approachable."
- Do not use generic words like "Good" or "Professional."

2. PILLARS (Array of Strings)
Identify the 3 core content buckets this brand consistently posts about. Keep them concise (1-3 words each).
- Example: ["Market Updates", "Property Tours", "Community Spotlight"]
- Example: ["Menu Features", "Behind the Scenes", "Guest Reposts"]

3. WESAY (Array of Strings)
Identify 5 specific phrases, keywords, or stylistic word choices this brand frequently uses to establish their identity.
- Look for signature sign-offs, specific adjectives they favor (e.g., "bespoke", "curated", "vibes"), or industry-specific terminology they lean into.

4. WEDONTSAY (Array of Strings)
Based on their tone and industry, deduce 5 phrases, cliché marketing terms, or tones this brand should NEVER use.
- If they are a high-end brand, they shouldn't say "cheap", "discount", or "act now!"
- If they are clinical/medical, they shouldn't use overly casual slang or emojis.
- If they are highly professional, they avoid "hey guys!" or desperate calls to action.

5. VISUALSTYLE (Array of Strings)
Infer 2-5 short visual descriptors from caption language AND the precomputed media mix (image vs video vs carousel). Examples: "bright interiors", "team candid", "product flat-lays", "event crowds", "Reels-first motion".
- Prefer evidence over cliché. If captions rarely describe visuals, lean on media mix (e.g. high video share → "motion / Reels-led").

CONSTRAINTS:
- You must return ONLY valid JSON matching the requested schema.
- Do not include any introductory or explanatory text.
- Base your analysis STRICTLY on the provided data. Do not hallucinate industry norms if they contradict the user's actual past behavior.
- Do NOT invent post frequency numbers or hashtag lists — those are computed outside your response.
`;
