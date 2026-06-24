import { describe, expect, it } from "vitest";
import { extractDominantColors, rgbToHex, type RGB } from "@/lib/brand-dna/palette";

const fill = (rgb: RGB, n: number): RGB[] => Array.from({ length: n }, () => ({ ...rgb }));
const RED: RGB = { r: 255, g: 0, b: 0 };
const BLUE: RGB = { r: 0, g: 0, b: 255 };

describe("rgbToHex", () => {
  it("formats and clamps", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 128 })).toBe("#ff0080");
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(rgbToHex({ r: 300, g: -5, b: 0 })).toBe("#ff0000");
  });
});

describe("extractDominantColors", () => {
  it("returns [] for empty input or non-positive k", () => {
    expect(extractDominantColors([], 5)).toEqual([]);
    expect(extractDominantColors(fill(RED, 4), 0)).toEqual([]);
  });

  it("collapses a single-color image to one color with full weight", () => {
    const out = extractDominantColors(fill(RED, 16), 5);
    expect(out).toHaveLength(1);
    expect(out[0].hex).toBe("#ff0000");
    expect(out[0].weight).toBe(1);
  });

  it("separates two equal clusters into two colors at ~50/50", () => {
    const out = extractDominantColors([...fill(RED, 5), ...fill(BLUE, 5)], 2);
    const hexes = out.map((c) => c.hex).sort();
    expect(hexes).toEqual(["#0000ff", "#ff0000"]);
    expect(out.every((c) => c.weight === 0.5)).toBe(true);
  });

  it("never returns more colors than distinct regions exist", () => {
    // Only two distinct colors but k=5 → can't over-split single-color boxes.
    const out = extractDominantColors([...fill(RED, 5), ...fill(BLUE, 5)], 5);
    expect(out.length).toBe(2);
  });

  it("weights sum to ~1", () => {
    const out = extractDominantColors(
      [...fill(RED, 7), ...fill(BLUE, 3), ...fill({ r: 0, g: 255, b: 0 }, 6)],
      3,
    );
    const total = out.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1, 2);
  });

  it("is deterministic", () => {
    const pixels = [...fill(RED, 6), ...fill(BLUE, 4)];
    expect(extractDominantColors(pixels, 3)).toEqual(extractDominantColors(pixels, 3));
  });
});
