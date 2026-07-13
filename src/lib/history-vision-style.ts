import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { anthropic } from "@/lib/ai/anthropic";
import { loadVisionJpegBase64 } from "@/lib/studio/vision-image-input";

const visionStyleSchema = z.object({
  visualStyle: z
    .array(z.string().min(2).max(60))
    .min(2)
    .max(5)
    .describe("2-5 concrete visual descriptors from the actual photos."),
});

const MAX_IMAGES = 8;

/**
 * Multimodal pass over sample post images to refine visualStyle.
 * Best-effort: failures return the caption-based seed unchanged.
 */
export async function refineVisualStyleFromImages(
  imageUrls: string[],
  seedStyle: string[],
  mediaMixSummary: string,
): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return seedStyle;

  const unique = [...new Set(imageUrls.map((u) => u.trim()).filter(Boolean))].slice(
    0,
    MAX_IMAGES,
  );
  if (unique.length === 0) return seedStyle;

  const loaded: { mediaType: "image/jpeg"; data: string }[] = [];
  for (const url of unique) {
    const data = await loadVisionJpegBase64(url);
    if (data) loaded.push({ mediaType: "image/jpeg", data });
  }
  if (loaded.length === 0) return seedStyle;

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: visionStyleSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a brand photography director. Study these ${loaded.length} recent social posts from one brand.

Precomputed media mix: ${mediaMixSummary || "unknown"}
Caption-side guesses (optional seed, override if photos disagree): ${seedStyle.join(", ") || "none"}

Return 2-5 short visualStyle labels grounded in what you SEE (subjects, setting, lighting, color, formality, text-on-image). Prefer concrete over vague ("golden-hour exteriors" beat "nice photos").`,
            },
            ...loaded.map((img) => ({
              type: "image" as const,
              image: `data:${img.mediaType};base64,${img.data}`,
            })),
          ],
        },
      ],
    });
    return object.visualStyle.length ? object.visualStyle : seedStyle;
  } catch (err) {
    console.error(
      "history-vision-style.refineVisualStyleFromImages",
      err instanceof Error ? err.message : err,
    );
    return seedStyle;
  }
}
