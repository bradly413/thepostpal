// ─────────────────────────────────────────────────────────────
//  Brand DNA — profile assembler (deterministic)
//
//  Integration point for slices 1–2: combines a user's captions (→ voice
//  fingerprint + signature vocabulary) and the per-image palettes from their
//  photos (→ one aggregated brand palette) into a single Brand DNA profile.
//
//  Pure + deterministic: the ingestion route decodes images to per-image
//  palettes (image-decode.ts) and passes them here alongside the captions. Model
//  semantics (tone/pillars via the existing zero-shot extraction) layer on top of
//  this measurable spine.
// ─────────────────────────────────────────────────────────────

import {
  computeVoiceFingerprint,
  type VoiceFingerprint,
} from "@/lib/brand-dna/voice-fingerprint";
import type { PaletteColor, RGB } from "@/lib/brand-dna/palette";
import { rgbToHex } from "@/lib/brand-dna/palette";

export interface VisualIdentity {
  /** Aggregated brand palette across all analyzed images (weights sum to ~1). */
  palette: PaletteColor[];
  imageCount: number;
}

export interface BrandDnaProfile {
  voice: VoiceFingerprint;
  visual: VisualIdentity;
  /** Surfaced from the voice fingerprint for convenience. */
  signatureVocabulary: string[];
  sampleSummary: { captions: number; images: number };
}

export interface AssembleInput {
  captions: string[];
  /** One palette per analyzed image (from extractPaletteFromImageBytes). */
  imagePalettes: PaletteColor[][];
}

const DEFAULT_BRAND_COLORS = 5;
// Max euclidean RGB distance (0..441) at which two colors are "the same brand
// color" and get merged during aggregation.
const MERGE_THRESHOLD = 40;

function distance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

interface Cluster {
  r: number;
  g: number;
  b: number;
  weight: number;
}

/**
 * Merge per-image palettes into a single brand palette. Each image contributes
 * equally (its colors are weighted by their in-image share / image count), then
 * near-identical colors are greedily merged. Deterministic; returns up to `k`
 * colors sorted by dominance, weights renormalized to sum to 1.
 */
export function aggregatePalettes(
  imagePalettes: PaletteColor[][],
  k = DEFAULT_BRAND_COLORS,
): PaletteColor[] {
  const images = imagePalettes.filter((p) => p.length > 0);
  if (images.length === 0 || k <= 0) return [];

  const items: { rgb: RGB; weight: number }[] = [];
  for (const pal of images) {
    for (const c of pal) items.push({ rgb: c.rgb, weight: c.weight / images.length });
  }
  // Heaviest colors anchor clusters first → stable, dominant-color-led merging.
  items.sort((a, b) => b.weight - a.weight);

  const clusters: Cluster[] = [];
  for (const it of items) {
    const match = clusters.find((cl) => distance(cl, it.rgb) <= MERGE_THRESHOLD);
    if (match) {
      const w = match.weight + it.weight;
      match.r = (match.r * match.weight + it.rgb.r * it.weight) / w;
      match.g = (match.g * match.weight + it.rgb.g * it.weight) / w;
      match.b = (match.b * match.weight + it.rgb.b * it.weight) / w;
      match.weight = w;
    } else {
      clusters.push({ r: it.rgb.r, g: it.rgb.g, b: it.rgb.b, weight: it.weight });
    }
  }

  const top = clusters
    .sort((a, b) => b.weight - a.weight)
    .slice(0, k);
  const totalWeight = top.reduce((s, c) => s + c.weight, 0) || 1;

  return top.map((c) => {
    const rgb: RGB = { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) };
    return { hex: rgbToHex(rgb), rgb, weight: round(c.weight / totalWeight) };
  });
}

/** Assemble the measurable Brand DNA profile from captions + per-image palettes. */
export function assembleBrandDna(input: AssembleInput): BrandDnaProfile {
  const captions = input.captions ?? [];
  const imagePalettes = input.imagePalettes ?? [];
  const voice = computeVoiceFingerprint(captions);

  return {
    voice,
    visual: {
      palette: aggregatePalettes(imagePalettes),
      imageCount: imagePalettes.length,
    },
    signatureVocabulary: voice.topTokens,
    sampleSummary: { captions: captions.length, images: imagePalettes.length },
  };
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
