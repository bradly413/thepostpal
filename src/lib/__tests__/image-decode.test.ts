import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  decodeImageToPixels,
  extractPaletteFromImageBytes,
} from "@/lib/brand-dna/image-decode";

// Fixtures are generated in-memory with sharp (lossless PNG) so assertions are
// exact. These exercise the real decode → downsample → quantize path end to end.

async function solidPng(r: number, g: number, b: number, size = 32): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();
}

/** A WxH image, left half color A, right half color B, as a lossless PNG. */
async function halfAndHalfPng(a: [number, number, number], b: [number, number, number]): Promise<Buffer> {
  const W = 32;
  const H = 32;
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const c = x < W / 2 ? a : b;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    }
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

describe("decodeImageToPixels", () => {
  it("decodes a solid image to a uniform pixel array", async () => {
    const pixels = await decodeImageToPixels(await solidPng(255, 0, 0), { maxDim: 16 });
    expect(pixels.length).toBe(16 * 16);
    expect(pixels.every((p) => p.r === 255 && p.g === 0 && p.b === 0)).toBe(true);
  });
});

describe("extractPaletteFromImageBytes", () => {
  it("extracts the single dominant color of a solid image", async () => {
    const palette = await extractPaletteFromImageBytes(await solidPng(0, 128, 255), 5);
    expect(palette).toHaveLength(1);
    expect(palette[0].hex).toBe("#0080ff");
    expect(palette[0].weight).toBeCloseTo(1, 2);
  });

  it("separates a two-color image into two dominant colors at ~50/50", async () => {
    const png = await halfAndHalfPng([255, 0, 0], [0, 0, 255]);
    const palette = await extractPaletteFromImageBytes(png, 2);
    const hexes = palette.map((c) => c.hex).sort();
    expect(hexes).toEqual(["#0000ff", "#ff0000"]);
    expect(palette.every((c) => Math.abs(c.weight - 0.5) < 0.05)).toBe(true);
  });

  it("composites transparency over white (no alpha skew)", async () => {
    // Fully transparent PNG → flattened to white → palette is white.
    const transparent = await sharp({
      create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const palette = await extractPaletteFromImageBytes(transparent, 3);
    expect(palette[0].hex).toBe("#ffffff");
  });
});
