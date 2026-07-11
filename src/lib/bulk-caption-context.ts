import { toneHintsForIds } from "@/lib/bulk-caption-tones";

const MAX_CONTEXT = 500;

export interface BulkCaptionContextInput {
  batchDirection: string;
  selectedToneIds: string[];
  photoNote?: string;
  batchIndex?: number;
  batchTotal?: number;
  priorCaptions?: string[];
}

/** Merge batch direction, tone chips, per-photo notes, and batch position for the caption API. */
export function buildBulkCaptionContext(input: BulkCaptionContextInput): string {
  const parts: string[] = [];

  const tones = toneHintsForIds(input.selectedToneIds);
  if (tones.length) {
    parts.push(`Tone: ${tones.join(" ")}`);
  }

  const direction = input.batchDirection.trim();
  if (direction) {
    parts.push(`Batch direction: ${direction}`);
  }

  const note = input.photoNote?.trim();
  if (note) {
    parts.push(`Notes for this photo: ${note}`);
  }

  if (
    input.batchIndex !== undefined &&
    input.batchTotal !== undefined &&
    input.batchTotal > 1
  ) {
    parts.push(
      `This is post ${input.batchIndex + 1} of ${input.batchTotal} in a batch — vary the opening from other posts.`,
    );
  }

  const prior = input.priorCaptions?.filter(Boolean).slice(-3) ?? [];
  if (prior.length) {
    parts.push(
      `Captions already used in this batch (do not echo):\n${prior.map((c) => `- ${c.slice(0, 120)}`).join("\n")}`,
    );
  }

  return parts.join("\n\n").slice(0, MAX_CONTEXT);
}

export interface CaptionVariantShape {
  angle: string;
  caption: string;
  hashtags: string[];
}

export function formatCaptionVariant(v: CaptionVariantShape): string {
  const tags = v.hashtags.length ? "\n\n" + v.hashtags.join(" ") : "";
  return v.caption + tags;
}
