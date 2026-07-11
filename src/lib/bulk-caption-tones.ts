/**
 * Quick tone chips for bulk caption direction.
 * `hint` steers the AI writing style (not content topic).
 */
export interface BulkCaptionToneChip {
  id: string;
  label: string;
  hint: string;
}

export const BULK_CAPTION_TONE_CHIPS: BulkCaptionToneChip[] = [
  {
    id: "short",
    label: "Short",
    hint: "Keep it brief — one or two tight sentences. No filler.",
  },
  {
    id: "excited",
    label: "Excited",
    hint: "Upbeat and energetic. Genuine enthusiasm — no ALL CAPS or exclamation overload.",
  },
  {
    id: "corporate",
    label: "Corporate",
    hint: "Polished and professional. Clear and credible, still sounds human.",
  },
  {
    id: "casual",
    label: "Casual",
    hint: "Relaxed and conversational, like talking to someone you know.",
  },
  {
    id: "warm",
    label: "Warm",
    hint: "Friendly and inviting. Makes the reader feel welcome.",
  },
];

export function toneHintsForIds(ids: string[]): string[] {
  const set = new Set(ids);
  return BULK_CAPTION_TONE_CHIPS.filter((c) => set.has(c.id)).map((c) => c.hint);
}
