import type { IndustryId } from "@/lib/industries";

/**
 * Vertical seed payloads injected into brand-book voice generation.
 * Each entry grounds the model in industry-specific vocabulary, focus,
 * constraints, and hard forbidden terms.
 */
export interface IndustrySeed {
  coreVocabulary: string;
  brandFocus: string;
  environmentalConstraints: string;
  forbiddenWords: string[];
}

export const INDUSTRY_SEEDS: Partial<Record<IndustryId, IndustrySeed>> = {
  "food-restaurant": {
    coreVocabulary:
      "Guests, service, back-of-house, covers, hospitality, chef-driven.",
    brandFocus:
      "Shift emphasis away from standard menu systems and heavily index on lifestyle collateral: custom packaging, branded coasters, staff apparel, and environmental design. Posts should feel like the room, the team, and the objects guests touch — not a PDF menu.",
    environmentalConstraints:
      "Assume indoor dynamic dining spaces. Do not generate copy about patios, rooftops, outdoor dining, beer gardens, or al fresco service unless the user explicitly declares outdoor seating.",
    forbiddenWords: [
      "Brokerage",
      "transaction",
      "listings",
      "MLS",
      "comps",
      "buyers",
      "seller",
      "closing",
      "open house",
      "dream home",
      "listing",
    ],
  },
};

export function getIndustrySeed(industryId: string | undefined): IndustrySeed | null {
  if (!industryId) return null;
  return INDUSTRY_SEEDS[industryId as IndustryId] ?? null;
}

/** Serialize a seed block for injection into the model system prompt. */
export function formatIndustrySeedForPrompt(seed: IndustrySeed): string {
  return `## Vertical seed (authoritative)
- Core vocabulary: ${seed.coreVocabulary}
- Brand focus: ${seed.brandFocus}
- Environmental constraints: ${seed.environmentalConstraints}
- Forbidden words (never use): ${seed.forbiddenWords.join(", ")}`;
}
