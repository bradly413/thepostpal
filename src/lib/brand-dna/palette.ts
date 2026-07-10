// ─────────────────────────────────────────────────────────────
//  Brand DNA — palette extraction (deterministic, model-free)
//
//  Pulls the dominant colors out of a user's REAL post images via median-cut
//  quantization. This seeds the brand palette from their actual aesthetic
//  instead of a curated guess — and, unlike a vision model, it can never
//  hallucinate a hex code (the colors are measured from the pixels).
//
//  Pure + deterministic: takes an array of RGB pixels and returns dominant
//  colors with their share of the image. The decode step (image bytes -> RGB[],
//  e.g. via `sharp` raw output, downsampled) is a thin adapter built separately;
//  this core is what the vision/semantic pass and the Studio image generator
//  consume.
// ─────────────────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor {
  hex: string; // "#rrggbb"
  rgb: RGB;
  weight: number; // 0..1 share of sampled pixels
}

type Box = RGB[];

/**
 * Extract up to `k` dominant colors from a flat array of RGB pixels.
 * Deterministic (no random seeding); returns colors sorted by descending share.
 * Returns [] for empty input or k <= 0, and never more colors than distinct
 * regions the pixels actually contain.
 */
export function extractDominantColors(pixels: RGB[], k = 5): PaletteColor[] {
  if (!Array.isArray(pixels) || pixels.length === 0 || k <= 0) return [];

  const boxes: Box[] = [pixels.slice()];

  while (boxes.length < k) {
    const idx = pickBoxToSplit(boxes);
    if (idx === -1) break; // nothing left is splittable
    const [a, b] = splitBox(boxes[idx]);
    if (a.length === 0 || b.length === 0) break;
    boxes.splice(idx, 1, a, b);
  }

  const total = pixels.length;
  return boxes
    .filter((box) => box.length > 0)
    .map((box) => {
      const rgb = averageColor(box);
      return { hex: rgbToHex(rgb), rgb, weight: round(box.length / total) };
    })
    .sort((x, y) => y.weight - x.weight || x.hex.localeCompare(y.hex));
}

/** Convert an RGB triple to a "#rrggbb" string (clamped, lowercased). */
export function rgbToHex({ r, g, b }: RGB): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ── median-cut internals ─────────────────────────────────────

const CHANNELS = ["r", "g", "b"] as const;
type Channel = (typeof CHANNELS)[number];

function ranges(box: Box): Record<Channel, number> {
  const min: Record<Channel, number> = { r: 255, g: 255, b: 255 };
  const max: Record<Channel, number> = { r: 0, g: 0, b: 0 };
  for (const p of box) {
    for (const c of CHANNELS) {
      const v = p[c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }
  return { r: max.r - min.r, g: max.g - min.g, b: max.b - min.b };
}

function longestChannel(box: Box): { channel: Channel; range: number } {
  const rg = ranges(box);
  let channel: Channel = "r";
  let range = rg.r;
  if (rg.g > range) {
    channel = "g";
    range = rg.g;
  }
  if (rg.b > range) {
    channel = "b";
    range = rg.b;
  }
  return { channel, range };
}

/** Pick the box with the greatest spread that is still splittable (range > 0). */
function pickBoxToSplit(boxes: Box[]): number {
  let best = -1;
  let bestRange = 0;
  let bestCount = 0;
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].length < 2) continue;
    const { range } = longestChannel(boxes[i]);
    if (range <= 0) continue;
    // Prefer larger spread; tie-break on larger pixel count for stability.
    if (range > bestRange || (range === bestRange && boxes[i].length > bestCount)) {
      best = i;
      bestRange = range;
      bestCount = boxes[i].length;
    }
  }
  return best;
}

function splitBox(box: Box): [Box, Box] {
  const { channel } = longestChannel(box);
  const sorted = box
    .slice()
    .sort((p, q) => p[channel] - q[channel] || p.r - q.r || p.g - q.g || p.b - q.b);
  const mid = Math.floor(sorted.length / 2);
  return [sorted.slice(0, mid), sorted.slice(mid)];
}

function averageColor(box: Box): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of box) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  const n = box.length;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

// ── helpers ──────────────────────────────────────────────────
function clampByte(n: number): number {
  const v = Math.round(n);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
