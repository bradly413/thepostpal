import "server-only";

import sharp from "sharp";
import {
  extractDominantColors,
  type PaletteColor,
  type RGB,
} from "@/lib/brand-dna/palette";

// ─────────────────────────────────────────────────────────────
//  Brand DNA — image decode adapter
//
//  Bridges real image bytes (jpeg/png/webp/…) into the deterministic
//  palette-extraction core. Downsamples first so palette extraction is fast and
//  cheap (a few thousand pixels is plenty for dominant-color detection), and
//  flattens alpha over white so transparent PNGs don't skew the result.
//
//  Server-only: `sharp` is a native module. The pure quantization lives in
//  palette.ts (unit-tested without any image); this is the thin I/O layer.
// ─────────────────────────────────────────────────────────────

export interface DecodeOptions {
  /** Longest side is downsampled to at most this (never enlarged). Default 64. */
  maxDim?: number;
}

/**
 * Decode encoded image bytes into a flat array of RGB pixels, downsampled.
 * Alpha is composited over white. Handles grayscale (1ch) and color (3–4ch).
 */
export async function decodeImageToPixels(
  bytes: Buffer | Uint8Array,
  opts: DecodeOptions = {},
): Promise<RGB[]> {
  const maxDim = opts.maxDim ?? 64;
  const { data, info } = await sharp(bytes)
    .resize(maxDim, maxDim, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixels: RGB[] = [];
  for (let i = 0; i + channels - 1 < data.length; i += channels) {
    if (channels >= 3) {
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    } else {
      const v = data[i]; // grayscale
      pixels.push({ r: v, g: v, b: v });
    }
  }
  return pixels;
}

/**
 * One-shot: encoded image bytes → dominant brand palette. This is what the
 * onboarding visual-analysis pass and the Studio aesthetic-matching call use.
 */
export async function extractPaletteFromImageBytes(
  bytes: Buffer | Uint8Array,
  k = 5,
  opts?: DecodeOptions,
): Promise<PaletteColor[]> {
  const pixels = await decodeImageToPixels(bytes, opts);
  return extractDominantColors(pixels, k);
}
