import type { IndustryId } from "@/lib/industries";
import type { EnforcementLevel, VerticalOption } from "@/lib/compliance/client-types";

/** Fallback catalog when VerticalSeed rows are not yet seeded in the DB. */
export const VERTICAL_CATALOG_FALLBACK: VerticalOption[] = [
  { slug: "real-estate", name: "Real Estate", parentSlug: null, enforcementLevel: "warn", regulatoryBody: "HUD/Fair Housing", guardrailSummary: "Fair Housing guardrails active" },
  { slug: "real-estate-residential-sales", name: "Residential Sales", parentSlug: "real-estate", enforcementLevel: "warn", regulatoryBody: "HUD/Fair Housing", guardrailSummary: "Fair Housing guardrails active" },
  { slug: "real-estate-commercial", name: "Commercial", parentSlug: "real-estate", enforcementLevel: "warn", regulatoryBody: "HUD/Fair Housing", guardrailSummary: "Fair Housing guardrails active" },
  { slug: "healthcare", name: "Healthcare", parentSlug: null, enforcementLevel: "block", regulatoryBody: "FDA", guardrailSummary: "FDA — restricted claims blocked" },
  { slug: "healthcare-pharma-sales", name: "Pharma Sales", parentSlug: "healthcare", enforcementLevel: "block", regulatoryBody: "FDA", guardrailSummary: "FDA — restricted claims blocked" },
  { slug: "healthcare-hospital-recruiting", name: "Hospital Recruiting", parentSlug: "healthcare", enforcementLevel: "warn", regulatoryBody: "FDA", guardrailSummary: "FDA — recruiting guardrails active" },
  { slug: "beauty", name: "Beauty", parentSlug: null, enforcementLevel: "warn", regulatoryBody: "FTC", guardrailSummary: "FTC — claim substantiation warnings" },
  { slug: "beauty-cosmetics-skincare", name: "Cosmetics / Skincare", parentSlug: "beauty", enforcementLevel: "warn", regulatoryBody: "FTC", guardrailSummary: "FTC — claim substantiation warnings" },
  { slug: "beauty-salon-services", name: "Salon / Services", parentSlug: "beauty", enforcementLevel: "warn", regulatoryBody: "FTC", guardrailSummary: "FTC — claim substantiation warnings" },
  { slug: "hospitality", name: "Hospitality", parentSlug: null, enforcementLevel: "suggest", regulatoryBody: null, guardrailSummary: "Brand voice guardrails active" },
  { slug: "hospitality-restaurants", name: "Restaurants", parentSlug: "hospitality", enforcementLevel: "suggest", regulatoryBody: null, guardrailSummary: "Brand voice guardrails active" },
  { slug: "hospitality-hotels", name: "Hotels", parentSlug: "hospitality", enforcementLevel: "suggest", regulatoryBody: null, guardrailSummary: "Brand voice guardrails active" },
  { slug: "local-services", name: "Local Services", parentSlug: null, enforcementLevel: "suggest", regulatoryBody: null, guardrailSummary: "Brand voice guardrails active" },
  { slug: "fitness", name: "Fitness", parentSlug: null, enforcementLevel: "suggest", regulatoryBody: null, guardrailSummary: "Brand voice guardrails active" },
  { slug: "professional-services", name: "Professional Services", parentSlug: null, enforcementLevel: "suggest", regulatoryBody: null, guardrailSummary: "Brand voice guardrails active" },
];

const INDUSTRY_TO_VERTICAL: Partial<Record<IndustryId, string>> = {
  "real-estate": "real-estate-residential-sales",
  "food-restaurant": "hospitality-restaurants",
  "fitness-wellness": "fitness",
  "beauty-personal-care": "beauty-salon-services",
  "professional-services": "professional-services",
  "creative-agency": "professional-services",
  "retail-ecommerce": "local-services",
  "coaching-education": "professional-services",
  "home-services": "local-services",
  "healthcare-practitioners": "healthcare",
  "hospitality-events": "hospitality",
  "other-general": "local-services",
};

export function suggestVerticalSlugForIndustry(industryId: string): string {
  return INDUSTRY_TO_VERTICAL[industryId as IndustryId] ?? "local-services";
}

export function guardrailSummaryFor(
  enforcementLevel: EnforcementLevel,
  regulatoryBody: string | null,
  name: string,
): string {
  if (regulatoryBody?.includes("Fair Housing") || regulatoryBody === "HUD/Fair Housing") {
    return enforcementLevel === "block"
      ? "Fair Housing — restricted language blocked"
      : "Fair Housing guardrails active";
  }
  if (regulatoryBody === "FDA") {
    return enforcementLevel === "block"
      ? "FDA — restricted claims blocked"
      : "FDA — restricted claims flagged";
  }
  if (regulatoryBody === "FTC") {
    return "FTC — restricted claims flagged";
  }
  if (enforcementLevel === "block") {
    return `${name} — restricted language blocked`;
  }
  if (enforcementLevel === "warn") {
    return `${name} — compliance warnings active`;
  }
  return "Brand voice guardrails active";
}

export function activeGuardrailLines(
  enforcementLevel: EnforcementLevel,
  regulatoryBody: string | null,
  bannedSample: string[],
): string[] {
  const lines: string[] = [];
  if (regulatoryBody) {
    lines.push(
      enforcementLevel === "block"
        ? `${regulatoryBody}: restricted claims blocked`
        : `${regulatoryBody}: flagged phrases reviewed before publish`,
    );
  }
  if (bannedSample.length > 0) {
    lines.push(`Watching for: ${bannedSample.slice(0, 4).join(", ")}${bannedSample.length > 4 ? ", …" : ""}`);
  }
  if (lines.length === 0) {
    lines.push("On-brand language suggestions enabled");
  }
  return lines;
}
