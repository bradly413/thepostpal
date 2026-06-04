// Brand-book tiers — three levels of brand book, gated in /dashboard/brand.
//   Basic   "Starter"    — identity + voice + visual basics (auto-generated)
//   Mid     "Brand Kit"  — + practical usage (photography direction, etc.)
//   Premium "Reference"  — the full 32-section designed book + PDF export
//
// NOTE: the user's tier source (Organization field / billing) is a follow-up —
// for now it defaults to "basic" and can be previewed via ?tier= in the URL.

export type BrandBookTier = "basic" | "mid" | "premium";

export const TIER_ORDER: BrandBookTier[] = ["basic", "mid", "premium"];

export const TIER_RANK: Record<BrandBookTier, number> = {
  basic: 0,
  mid: 1,
  premium: 2,
};

export const TIER_LABEL: Record<BrandBookTier, string> = {
  basic: "Starter",
  mid: "Brand Kit",
  premium: "Reference",
};

export const TIER_BLURB: Record<BrandBookTier, string> = {
  basic: "Your identity, voice, and visual basics — everything Posterboy needs to sound like you.",
  mid: "A working brand kit: usage rules, photography direction, and positioning you can hand to any designer.",
  premium: "The full designed reference book — every section, print-ready, exported as a PDF.",
};

// Which tier unlocks each in-app brand-book section.
export const SECTION_TIER: Record<string, BrandBookTier> = {
  essence: "basic",
  voice: "basic",
  logo: "basic",
  color: "basic",
  typography: "basic",
  photography: "mid",
  applications: "premium",
};

export function sectionRequiredTier(sectionId: string): BrandBookTier {
  return SECTION_TIER[sectionId] ?? "basic";
}

export function isSectionUnlocked(sectionId: string, userTier: BrandBookTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[sectionRequiredTier(sectionId)];
}

/** The next tier up from the given one (for upsell CTAs); null if already top. */
export function nextTier(tier: BrandBookTier): BrandBookTier | null {
  const i = TIER_RANK[tier];
  return i < 2 ? TIER_ORDER[i + 1] : null;
}

/** Parse a tier value (e.g. from a URL preview param); falls back to "basic". */
export function parseTier(value: string | null | undefined): BrandBookTier {
  return value === "mid" || value === "premium" ? value : "basic";
}
