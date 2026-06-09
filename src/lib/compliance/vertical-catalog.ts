import type { EnforcementLevel, VerticalOption } from "@/lib/compliance/client-types";
import { mapIndustryToVerticalSlug } from "@/lib/compliance/vertical-mapping";

/**
 * Fallback catalog when VerticalSeed rows are not yet seeded in the DB.
 * Slugs MUST stay in sync with scripts/seed-verticals.ts (the authoritative source).
 */
export const VERTICAL_CATALOG_FALLBACK: VerticalOption[] = [
  { slug: "real-estate-parent", name: "Real Estate & Housing", parentSlug: null, enforcementLevel: "warn", regulatoryBody: "HUD (Fair Housing Act)", guardrailSummary: "Fair Housing guardrails active" },
  { slug: "real-estate-residential", name: "Residential Real Estate", parentSlug: "real-estate-parent", enforcementLevel: "warn", regulatoryBody: "HUD / Local MLS", guardrailSummary: "Fair Housing guardrails active" },
  { slug: "real-estate-mortgage", name: "Mortgage & Lending", parentSlug: "real-estate-parent", enforcementLevel: "block", regulatoryBody: "CFPB (TILA/RESPA)", guardrailSummary: "TILA — trigger-term claims blocked" },
  { slug: "healthcare-parent", name: "Healthcare & Pharma", parentSlug: null, enforcementLevel: "block", regulatoryBody: "FDA / FTC / HIPAA", guardrailSummary: "FDA — restricted claims blocked" },
  { slug: "pharma-sales", name: "Pharmaceutical Sales", parentSlug: "healthcare-parent", enforcementLevel: "block", regulatoryBody: "FDA (OPDP)", guardrailSummary: "FDA — fair balance enforced" },
  { slug: "hospital-recruiting", name: "Hospital & Healthcare Recruiting", parentSlug: null, enforcementLevel: "warn", regulatoryBody: "EEOC", guardrailSummary: "EEOC — recruiting guardrails active" },
  { slug: "supplements-wellness", name: "Dietary Supplements & Wellness", parentSlug: "healthcare-parent", enforcementLevel: "block", regulatoryBody: "FDA / FTC", guardrailSummary: "DSHEA — disease claims blocked" },
  { slug: "beauty-parent", name: "Beauty & Personal Care", parentSlug: null, enforcementLevel: "warn", regulatoryBody: "FTC / FDA", guardrailSummary: "FTC — claim substantiation warnings" },
  { slug: "beauty-med-spa", name: "Med-Spa & Aesthetic Clinics", parentSlug: "beauty-parent", enforcementLevel: "block", regulatoryBody: "FDA / State Medical Boards", guardrailSummary: "Medical-procedure claims blocked" },
  { slug: "finance-parent", name: "Financial & Wealth Services", parentSlug: null, enforcementLevel: "block", regulatoryBody: "FINRA / SEC", guardrailSummary: "FINRA — promissory claims blocked" },
  { slug: "smb-parent", name: "General SMB & Local Business", parentSlug: null, enforcementLevel: "suggest", regulatoryBody: "FTC (Truth in Advertising)", guardrailSummary: "Brand voice guardrails active" },
  { slug: "smb-hospitality", name: "Restaurants & Hospitality", parentSlug: "smb-parent", enforcementLevel: "suggest", regulatoryBody: "FDA (Food Code) / Local Health", guardrailSummary: "Brand voice + allergen guardrails" },
];

/** UI default when onboarding industry has no confident vertical mapping. */
export function suggestVerticalSlugForIndustry(industryId: string): string {
  return mapIndustryToVerticalSlug(industryId) ?? "smb-parent";
}

export function guardrailSummaryFor(
  enforcementLevel: EnforcementLevel,
  regulatoryBody: string | null,
  name: string,
): string {
  if (regulatoryBody?.includes("Fair Housing") || regulatoryBody?.includes("HUD")) {
    return enforcementLevel === "block"
      ? "Fair Housing — restricted language blocked"
      : "Fair Housing guardrails active";
  }
  if (regulatoryBody?.includes("FINRA")) {
    return "FINRA — promissory claims blocked";
  }
  if (regulatoryBody?.includes("FDA")) {
    return enforcementLevel === "block"
      ? "FDA — restricted claims blocked"
      : "FDA — restricted claims flagged";
  }
  if (regulatoryBody?.includes("FTC")) {
    return "FTC — restricted claims flagged";
  }
  if (regulatoryBody?.includes("EEOC")) {
    return "EEOC — recruiting guardrails active";
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
