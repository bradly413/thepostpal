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
 *   Parents:  real-estate, healthcare, beauty, hospitality,
 *             local-services, fitness, professional-services
 *   Children: real-estate-residential-sales, real-estate-commercial,
 *             healthcare-pharma-sales, healthcare-hospital-recruiting,
 *             beauty-cosmetics-skincare, beauty-salon-services,
 *             hospitality-restaurants, hospitality-hotels, hospitality-salons
 *
 * Pure, dependency-free — no Prisma, no server-only — so it can be unit tested
 * and imported anywhere.
 */

/** Known onboarding IndustryId -> seeded VerticalSeed slug. */
const INDUSTRY_ID_TO_SLUG: Record<string, string> = {
  // Regulated showcase verticals
  "real-estate": "real-estate",
  "beauty-personal-care": "beauty-salon-services",
  "healthcare-practitioners": "healthcare",
  // Hospitality family
  "food-restaurant": "hospitality-restaurants",
  "hospitality-events": "hospitality-hotels",
  // Generic "suggest" parents — safe, no regulatory blacklist
  "fitness-wellness": "fitness",
  "professional-services": "professional-services",
  "home-services": "local-services",
  // No confident, non-misleading vertical for these → null (no guardrails)
  // "creative-agency", "retail-ecommerce", "coaching-education", "other-general"
};

/**
 * Looser aliases for free-text "niche" / legacy industry strings that aren't
 * canonical IndustryId values. Matched only after exact IndustryId lookup fails.
 * Keys are lowercased substrings; the FIRST match wins, so order matters
 * (more-specific phrases first).
 */
const ALIAS_KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  ["real estate", "real-estate"],
  ["realtor", "real-estate"],
  ["broker", "real-estate"],
  ["restaurant", "hospitality-restaurants"],
  ["cafe", "hospitality-restaurants"],
  ["café", "hospitality-restaurants"],
  ["bakery", "hospitality-restaurants"],
  ["hotel", "hospitality-hotels"],
  ["salon", "beauty-salon-services"],
  ["spa", "beauty-salon-services"],
  ["barber", "beauty-salon-services"],
  ["beauty", "beauty-salon-services"],
  ["cosmetic", "beauty-cosmetics-skincare"],
  ["skincare", "beauty-cosmetics-skincare"],
  ["pharma", "healthcare-pharma-sales"],
  ["healthcare", "healthcare"],
  ["medical", "healthcare"],
  ["dentist", "healthcare"],
  ["fitness", "fitness"],
  ["gym", "fitness"],
  ["wellness", "fitness"],
  ["professional service", "professional-services"],
  ["accountant", "professional-services"],
  ["lawyer", "professional-services"],
  ["consult", "professional-services"],
  ["home service", "local-services"],
  ["contractor", "local-services"],
  ["hvac", "local-services"],
  ["plumb", "local-services"],
  ["landscap", "local-services"],
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
