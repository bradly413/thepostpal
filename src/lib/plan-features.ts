import type { PlanTier } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
//  Plan-tier capability map — the single place that decides what
//  surface area a tenant sees. Solo / single-location plans get an
//  elite, distraction-free dashboard; multi-location plans get the
//  full enterprise surface (location roll-ups, cross-location
//  selectors, team approval routing).
//
//  Commercial "Command" tier ($249 + $39/location) maps to PlanTier
//  `house_account`. There is no literal `command` enum — the gate is
//  single- vs multi-location, mirroring logic in /api/locations.
// ─────────────────────────────────────────────────────────────

export const SINGLE_LOCATION_PLANS: ReadonlySet<PlanTier> = new Set<PlanTier>([
  "solo",
  "shop",
  "press",
  "studio",
]);

export interface PlanFeatures {
  /** Show the LocationSwitcher + cross-location selectors. */
  multiLocation: boolean;
  /** Show the team submit/approve/request-changes pipeline. */
  approvalPipeline: boolean;
  /** Show member/role management UI. */
  teamManagement: boolean;
  /** Show the /dashboard/organization roll-up + its nav entry. */
  locationRollup: boolean;
  /** Primary action on the post composer. */
  composerPrimaryAction: "schedule" | "submit";
  /** Meta Ads builder + Marketing API (Command tier + META_ADS_ENABLED). */
  metaAds: boolean;
  /** Pro image model (Nano Banana Pro / gemini-3-pro-image) in the studio.
   *  Upgrade option — multi-location tiers for now; a Stripe add-on will refine. */
  proImageModel: boolean;
}

export function isMultiLocationPlan(plan: PlanTier): boolean {
  return !SINGLE_LOCATION_PLANS.has(plan);
}

export function planFeatures(plan: PlanTier): PlanFeatures {
  const multi = isMultiLocationPlan(plan);
  return {
    multiLocation: multi,
    approvalPipeline: multi,
    teamManagement: multi,
    locationRollup: multi,
    composerPrimaryAction: multi ? "submit" : "schedule",
    metaAds: multi,
    proImageModel: multi,
  };
}

/** Plan allows the Pro image model (server-side gate for /api/generate-image). */
export function isProImagePlanEnabled(plan: PlanTier): boolean {
  return planFeatures(plan).proImageModel;
}

/** Plan allows Meta Ads; still requires META_ADS_ENABLED=true at runtime. */
export function isMetaAdsPlanEnabled(plan: PlanTier): boolean {
  return planFeatures(plan).metaAds;
}

export function isMetaAdsFeatureActive(plan: PlanTier): boolean {
  return isMetaAdsPlanEnabled(plan) && process.env.META_ADS_ENABLED === "true";
}

/** Conservative default before /api/me resolves: streamlined (solo) surface. */
export const STREAMLINED_FEATURES: PlanFeatures = planFeatures("solo");
