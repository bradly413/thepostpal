import type { BrandEngineDna } from "@/lib/brand-engine-dna";

export interface LocationGeography {
  city: string | null;
  state: string | null;
  country: string | null;
}

export function formatLocationGeography(location: LocationGeography): string | null {
  const parts = [location.city, location.state, location.country]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

type ImageBrandContext = Partial<BrandEngineDna> | null;

/**
 * Silently augments the user prompt with tenant geography + brandEngine vibe
 * so generated scenes match regional architecture and brand tone.
 */
export function buildAugmentedImagePrompt(
  basePrompt: string,
  geography: string,
  brand: ImageBrandContext,
): string {
  const trimmed = basePrompt.trim();
  if (!trimmed) {
    return trimmed;
  }

  const blocks: string[] = [
    trimmed,
    [
      `CRITICAL CONTEXT: Architectural style, vegetation, streetscape, and lighting must strictly reflect ${geography}.`,
      "Do NOT generate tropical, coastal, palm-lined, or other geographically inaccurate environments unless the user explicitly requests them.",
      "Prefer region-appropriate building materials, seasonal light, and local landscaping.",
    ].join(" "),
  ];

  if (brand?.niche) {
    blocks.push(`Business niche: ${brand.niche}.`);
  }
  if (brand?.primaryTone) {
    blocks.push(`Brand tone: ${brand.primaryTone}.`);
  }
  if (brand?.contrastVibe) {
    blocks.push(`Visual tone and contrast vibe: ${brand.contrastVibe}.`);
  }

  blocks.push(
    "Render as highly realistic, professional editorial photography suitable for local business social media.",
  );

  return blocks.join("\n");
}
