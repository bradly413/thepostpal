import "server-only";

import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@/lib/ai/anthropic";
import {
  ZERO_SHOT_EXTRACTION_PROMPT,
  zeroShotExtractionSchema,
  type ZeroShotExtraction,
} from "@/lib/zero-shot-extraction";

// ─────────────────────────────────────────────────────────────
//  Brand DNA — semantic enrichment (model-based, PAID)
//
//  Layers model-inferred meaning on top of the deterministic profile:
//   • voice  — tone / pillars / weSay / weDontSay from the user's captions
//              (reuses the existing zero-shot extraction).
//   • visual — subjects / composition / lighting / mood / overlay style from
//              their actual post images (a vision pass).
//
//  Every call is best-effort: returns null on missing API key, no input, or any
//  upstream/schema failure — so the caller (the analyze route) degrades to the
//  free deterministic profile rather than erroring. The route gates this behind
//  an explicit opt-in + a paid daily cap.
// ─────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-6";
const DEFAULT_VISION_SAMPLE = 8;

export const visualSemanticsSchema = z.object({
  subjects: z
    .array(z.string().min(2).max(40))
    .min(1)
    .max(8)
    .describe("What the photos actually depict — e.g. 'plated food', 'people', 'storefront', 'product close-up'."),
  composition: z
    .array(z.string().min(2).max(40))
    .min(1)
    .max(6)
    .describe("Framing patterns — e.g. 'flat-lay', 'candid', 'centered product hero', 'wide environment'."),
  lighting: z.string().min(3).max(120).describe("Dominant lighting & color treatment, e.g. 'warm natural daylight'."),
  mood: z.array(z.string().min(2).max(40)).min(1).max(6).describe("Emotional register — e.g. 'cozy', 'energetic', 'premium'."),
  textOverlayStyle: z
    .string()
    .min(2)
    .max(160)
    .describe("How on-image text is used, or 'none' if photos are clean."),
  aestheticConsistency: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 — how visually consistent the set is (1 = highly cohesive)."),
  summary: z.string().min(8).max(400).describe("One-sentence description of the brand's visual identity."),
});

export type VisualSemantics = z.infer<typeof visualSemanticsSchema>;

export interface BrandDnaEnrichment {
  voice: ZeroShotExtraction | null;
  visual: VisualSemantics | null;
}

const VISUAL_SEMANTICS_PROMPT = `You are an elite brand photographer and art director. You are shown a set of photos from ONE brand's social feed. Infer their shared visual identity into the strict schema. Describe only what is actually visible across the set; do not invent. Judge aesthetic consistency honestly. Output JSON only.`;

function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Infer tone / pillars / weSay / weDontSay from the user's own captions. */
export async function enrichVoiceSemantics(captions: string[]): Promise<ZeroShotExtraction | null> {
  if (!hasApiKey()) return null;
  const clean = (captions ?? []).map((c) => (c ?? "").trim()).filter(Boolean);
  if (clean.length === 0) return null;
  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: zeroShotExtractionSchema,
      system: ZERO_SHOT_EXTRACTION_PROMPT,
      prompt: `Here is an array of the brand's recent captions:\n${JSON.stringify(clean)}`,
    });
    return object;
  } catch (err) {
    console.warn("[brand-dna] voice enrichment failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Infer the brand's visual identity from a sample of their post images. */
export async function enrichVisualSemantics(
  images: Buffer[],
  opts: { maxImages?: number } = {},
): Promise<VisualSemantics | null> {
  if (!hasApiKey()) return null;
  const sample = (images ?? []).slice(0, opts.maxImages ?? DEFAULT_VISION_SAMPLE);
  if (sample.length === 0) return null;
  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: visualSemanticsSchema,
      system: VISUAL_SEMANTICS_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these ${sample.length} photos from one brand's social feed and infer their shared visual identity.`,
            },
            ...sample.map((image) => ({ type: "image" as const, image })),
          ],
        },
      ],
    });
    return object;
  } catch (err) {
    console.warn("[brand-dna] visual enrichment failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Run both enrichments concurrently. Each degrades to null independently. */
export async function enrichBrandDna(
  input: { captions: string[]; images: Buffer[] },
  opts?: { maxImages?: number },
): Promise<BrandDnaEnrichment> {
  const [voice, visual] = await Promise.all([
    enrichVoiceSemantics(input.captions),
    enrichVisualSemantics(input.images, opts),
  ]);
  return { voice, visual };
}
