/**
 * Map an onboarding industry to a seeded VerticalSeed slug.
 *
 * Bridges the onboarding industry taxonomy (src/lib/industries.ts — IndustryId
 * values like "real-estate", "food-restaurant") to the compliance registry's
 * seeded slugs (scripts/seed-verticals.ts). This is the unlock: until now a
 * tenant could only get a verticalSlug via raw DB. Setting/updating a tenant's
 * industry now also sets Organization.verticalSlug via this mapping.
 *
 * Safety: unknown / unsure industries return `null` so no guardrails are applied
 * (a tenant with no vertical behaves exactly as before). Only confident mappings
 * to REAL seeded slugs are returned.
 *
 * Seeded slugs (must stay in sync with scripts/seed-verticals.ts):
 *   Parents:  real-estate-parent, healthcare-parent, beauty-parent,
 *             finance-parent, smb-parent
 *   Children: real-estate-residential, real-estate-mortgage,
 *             pharma-sales, hospital-recruiting, supplements-wellness,
 *             beauty-med-spa, smb-hospitality
 *
 * Pure, dependency-free — no Prisma, no server-only — so it can be unit tested
 * and imported anywhere.
 */

/** Known onboarding IndustryId -> seeded VerticalSeed slug. */
const INDUSTRY_ID_TO_SLUG: Record<string, string> = {
  // Regulated showcase verticals
  "real-estate": "real-estate-residential",
  "beauty-personal-care": "beauty-parent",
  "healthcare-practitioners": "healthcare-parent",
  // Hospitality / food → SMB hospitality
  "food-restaurant": "smb-hospitality",
  "hospitality-events": "smb-hospitality",
  // Generic "suggest" SMB parent — safe, no regulatory blacklist
  "fitness-wellness": "smb-parent",
  "professional-services": "smb-parent",
  "home-services": "smb-parent",
  // No confident, non-misleading vertical for these → null (no guardrails)
  // "creative-agency", "retail-ecommerce", "coaching-education", "other-general"
};

/**
 * Looser aliases for free-text "niche" / legacy industry strings that aren't
 * canonical IndustryId values. Matched only after exact IndustryId lookup fails.
 * Keys are lowercased substrings; the FIRST match wins, so order matters
 * (MORE-SPECIFIC phrases first — e.g. "med spa" before "spa", "mortgage" before
 * "real estate", "supplement" before "health").
 */
const ALIAS_KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  // Mortgage / lending (block) — before generic real estate
  ["mortgage", "real-estate-mortgage"],
  ["lending", "real-estate-mortgage"],
  ["loan officer", "real-estate-mortgage"],
  // Real estate (warn)
  ["real estate", "real-estate-residential"],
  ["realtor", "real-estate-residential"],
  ["broker", "real-estate-residential"],
  // Financial (block)
  ["financial advisor", "finance-parent"],
  ["wealth", "finance-parent"],
  ["investment", "finance-parent"],
  ["financial", "finance-parent"],
  // Med-spa / aesthetics (block) — before "spa" / "beauty"
  ["med spa", "beauty-med-spa"],
  ["medspa", "beauty-med-spa"],
  ["med-spa", "beauty-med-spa"],
  ["botox", "beauty-med-spa"],
  ["injectable", "beauty-med-spa"],
  ["aesthetic", "beauty-med-spa"],
  // Beauty (warn)
  ["salon", "beauty-parent"],
  ["spa", "beauty-parent"],
  ["barber", "beauty-parent"],
  ["cosmetic", "beauty-parent"],
  ["skincare", "beauty-parent"],
  ["beauty", "beauty-parent"],
  // Healthcare / pharma (block) — supplements + recruiting before generic
  ["supplement", "supplements-wellness"],
  ["vitamin", "supplements-wellness"],
  ["nutraceutical", "supplements-wellness"],
  ["nurse recruit", "hospital-recruiting"],
  ["hospital recruit", "hospital-recruiting"],
  ["healthcare recruit", "hospital-recruiting"],
  ["pharmaceutical", "pharma-sales"],
  ["pharma", "pharma-sales"],
  ["healthcare", "healthcare-parent"],
  ["medical", "healthcare-parent"],
  ["clinic", "healthcare-parent"],
  ["dentist", "healthcare-parent"],
  ["dental", "healthcare-parent"],
  ["physician", "healthcare-parent"],
  // Restaurants / hospitality (suggest)
  ["restaurant", "smb-hospitality"],
  ["cafe", "smb-hospitality"],
  ["café", "smb-hospitality"],
  ["bakery", "smb-hospitality"],
  ["hotel", "smb-hospitality"],
  ["catering", "smb-hospitality"],
  // Generic SMB (suggest)
  ["fitness", "smb-parent"],
  ["gym", "smb-parent"],
  ["wellness", "smb-parent"],
  ["professional service", "smb-parent"],
  ["accountant", "smb-parent"],
  ["lawyer", "smb-parent"],
  ["attorney", "smb-parent"],
  ["consult", "smb-parent"],
  ["home service", "smb-parent"],
  ["contractor", "smb-parent"],
  ["hvac", "smb-parent"],
  ["plumb", "smb-parent"],
  ["landscap", "smb-parent"],
  ["roofing", "smb-parent"],
];

/**
 * Resolve an onboarding industry (IndustryId or free-text niche) to a seeded
 * VerticalSeed slug, or `null` when there is no confident match.
 *
 * `null` is the safe default: the tenant gets no guardrails and behaves exactly
 * as before. Never throws.
 */
export function mapIndustryToVerticalSlug(
  industry: string | null | undefined,
): string | null {
  if (!industry) return null;
  const key = industry.trim().toLowerCase();
  if (!key) return null;

  // 1) Exact canonical IndustryId match.
  if (key in INDUSTRY_ID_TO_SLUG) return INDUSTRY_ID_TO_SLUG[key];

  // 2) Best-effort keyword alias match for free-text niches / legacy strings.
  for (const [needle, slug] of ALIAS_KEYWORDS) {
    if (key.includes(needle)) return slug;
  }

  // Unknown / unsure → no guardrails.
  return null;
}
