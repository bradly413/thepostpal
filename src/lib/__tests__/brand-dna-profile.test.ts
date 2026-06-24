import { describe, expect, it } from "vitest";
import { aggregatePalettes, assembleBrandDna } from "@/lib/brand-dna/profile";
import type { PaletteColor, RGB } from "@/lib/brand-dna/palette";

const color = (rgb: RGB, weight: number): PaletteColor => ({
  hex: `#${[rgb.r, rgb.g, rgb.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`,
  rgb,
  weight,
});
const RED: RGB = { r: 255, g: 0, b: 0 };
const BLUE: RGB = { r: 0, g: 0, b: 255 };

describe("aggregatePalettes", () => {
  it("returns [] for no images", () => {
    expect(aggregatePalettes([])).toEqual([]);
    expect(aggregatePalettes([[]])).toEqual([]);
  });

  it("collapses multiple same-color images into one brand color", () => {
    const out = aggregatePalettes([[color(RED, 1)], [color(RED, 1)]]);
    expect(out).toHaveLength(1);
    expect(out[0].hex).toBe("#ff0000");
    expect(out[0].weight).toBe(1);
  });

  it("keeps two distinct brand colors at ~50/50", () => {
    const out = aggregatePalettes([[color(RED, 1)], [color(BLUE, 1)]]);
    const hexes = out.map((c) => c.hex).sort();
    expect(hexes).toEqual(["#0000ff", "#ff0000"]);
    expect(out.every((c) => Math.abs(c.weight - 0.5) < 0.001)).toBe(true);
  });

  it("merges near-identical colors below the distance threshold", () => {
    // {250,1,2} and {255,0,0} are within the merge threshold → one cluster.
    const out = aggregatePalettes([[color({ r: 250, g: 1, b: 2 }, 1)], [color({ r: 255, g: 0, b: 0 }, 1)]]);
    expect(out).toHaveLength(1);
    expect(out[0].weight).toBe(1);
  });

  it("renormalizes returned weights to sum to ~1", () => {
    const out = aggregatePalettes(
      [[color(RED, 0.6), color(BLUE, 0.4)], [color({ r: 0, g: 255, b: 0 }, 1)]],
      3,
    );
    const total = out.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  it("is deterministic", () => {
    const input = [[color(RED, 0.7), color(BLUE, 0.3)], [color(BLUE, 1)]];
    expect(aggregatePalettes(input)).toEqual(aggregatePalettes(input));
  });
});

describe("assembleBrandDna", () => {
  it("combines voice + visual into one profile with sample counts", () => {
    const profile = assembleBrandDna({
      captions: ["Fresh fades every day 💈", "fresh cuts, fresh vibes — come through!"],
      imagePalettes: [[color(RED, 1)], [color(BLUE, 1)]],
    });

    expect(profile.sampleSummary).toEqual({ captions: 2, images: 2 });
    expect(profile.voice.sampleCount).toBe(2);
    expect(profile.signatureVocabulary).toEqual(profile.voice.topTokens);
    expect(profile.signatureVocabulary).toContain("fresh");
    expect(profile.visual.imageCount).toBe(2);
    expect(profile.visual.palette.map((c) => c.hex).sort()).toEqual(["#0000ff", "#ff0000"]);
  });

  it("handles an empty corpus without throwing", () => {
    const profile = assembleBrandDna({ captions: [], imagePalettes: [] });
    expect(profile.voice.sampleCount).toBe(0);
    expect(profile.visual.palette).toEqual([]);
    expect(profile.sampleSummary).toEqual({ captions: 0, images: 0 });
  });
});
