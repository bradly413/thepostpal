import type { BrandBook, BrandPalette } from "@/lib/brand-book-schema";

/** Curated palette IDs — the only colors the AI may reference. */
export type CuratedPaletteId =
  | "sharp-professional"
  | "smart-casual"
  | "jeans-tshirt"
  | "boots-flannel";

export interface CuratedPalette {
  id: CuratedPaletteId;
  name: string;
  primary: string;
  foundation: string;
  secondary: string;
  accent: string;
}

export const CURATED_PALETTE_IDS: CuratedPaletteId[] = [
  "sharp-professional",
  "smart-casual",
  "jeans-tshirt",
  "boots-flannel",
];

export const CURATED_PALETTES: Record<CuratedPaletteId, CuratedPalette> = {
  "sharp-professional": {
    id: "sharp-professional",
    name: "Sharp & Professional",
    primary: "#1A1A1A",
    foundation: "#F5F0E6",
    secondary: "#5C6B7A",
    accent: "#B8A078",
  },
  "smart-casual": {
    id: "smart-casual",
    name: "Smart Casual & Modern",
    primary: "#0E2547",
    foundation: "#F6F4EF",
    secondary: "#4A6FA5",
    accent: "#E85D2C",
  },
  "jeans-tshirt": {
    id: "jeans-tshirt",
    name: "Jeans & a T-Shirt",
    primary: "#8B3A2A",
    foundation: "#F4EDE0",
    secondary: "#5A6B4A",
    accent: "#D4A72C",
  },
  "boots-flannel": {
    id: "boots-flannel",
    name: "Boots & Flannel",
    primary: "#2D4A3E",
    foundation: "#E8DFD0",
    secondary: "#4A3728",
    accent: "#C67A4B",
  },
};

function hexToRgbDot(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r}·${g}·${b}`;
}

/** Map registry entry → BrandBook palette (ink / bone / muted / signal). */
export function paletteToBrandPalette(id: CuratedPaletteId): BrandPalette {
  const c = CURATED_PALETTES[id];
  return {
    ink: {
      name: "Primary",
      hex: c.primary,
      role: "primary-dark",
      rgb: hexToRgbDot(c.primary),
    },
    bone: {
      name: "Foundation",
      hex: c.foundation,
      role: "primary-light",
      rgb: hexToRgbDot(c.foundation),
    },
    muted: {
      name: "Secondary",
      hex: c.secondary,
      role: "accent",
      rgb: hexToRgbDot(c.secondary),
    },
    signal: {
      name: "Accent",
      hex: c.accent,
      role: "accent",
      rgb: hexToRgbDot(c.accent),
    },
    proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
  };
}

export function isCuratedPaletteId(value: string | undefined): value is CuratedPaletteId {
  return Boolean(value && value in CURATED_PALETTES);
}

/** Apply stored paletteId onto a brand book (safe for dashboard render). */
export function applyCuratedPaletteToBook(book: BrandBook): BrandBook {
  const id = book.identity?.paletteId;
  if (!isCuratedPaletteId(id)) return book;
  return {
    ...book,
    palette: paletteToBrandPalette(id),
  };
}
