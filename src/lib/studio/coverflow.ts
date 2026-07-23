/** Coverflow slide roles — mirrors the classic selected/prev/next layout. */

export type CoverflowRole =
  | "selected"
  | "prev"
  | "next"
  | "prevLeftSecond"
  | "nextRightSecond"
  | "hideLeft"
  | "hideRight";

export function coverflowRole(index: number, selected: number): CoverflowRole {
  const d = index - selected;
  if (d === 0) return "selected";
  if (d === -1) return "prev";
  if (d === 1) return "next";
  if (d === -2) return "prevLeftSecond";
  if (d === 2) return "nextRightSecond";
  if (d < 0) return "hideLeft";
  return "hideRight";
}

/** Prompt for slide k of n (1-based k) continuing a carousel set. */
const SLIDE_BEATS = [
  "Hero opener: strongest single scene, clear focal subject, room for a short headline.",
  "Proof beat: tighter detail or close-up that supports the claim — different crop and angle than slide 1.",
  "Offer beat: a distinct service, dish, or product moment — new composition, not a copy of prior slides.",
  "Atmosphere beat: wider environmental/mood shot that expands the world — different lighting emphasis.",
  "Closer beat: inviting final frame with clear brand presence — unique layout, not a repeat.",
] as const;

export function carouselSlidePrompt(
  baseIntent: string,
  slideIndexZeroBased: number,
  total: number,
): string {
  const n = Math.min(5, Math.max(2, Math.round(total) || 3));
  const k = Math.min(n, Math.max(1, slideIndexZeroBased + 1));
  const base = baseIntent.trim().slice(0, 520);
  const beat = SLIDE_BEATS[k - 1] || SLIDE_BEATS[SLIDE_BEATS.length - 1];
  if (k === 1) {
    return enrichCarouselHero(base, n, beat);
  }
  const note = [
    `Instagram carousel slide ${k} of ${n}.`,
    beat,
    "Same brand world and palette as the set — MUST be a visually different image (new camera angle, subject emphasis, and crop). Never duplicate slide 1.",
    "No fake UI chrome, no phone frames, no watermark.",
  ].join(" ");
  const combined = `${base}\n\n${note}`;
  return combined.length > 980 ? combined.slice(0, 980) : combined;
}

function enrichCarouselHero(base: string, n: number, beat: string): string {
  if (/\bcarousel\b/i.test(base) && /\bslide\s*1\b/i.test(base)) return base;
  const note = `Prepare slide 1 of ${n} for a carousel. ${beat}`;
  const combined = `${base}\n\n${note}`;
  return combined.length > 980 ? combined.slice(0, 980) : combined;
}
