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
  /** Nano Banana Pro (`gemini-3-pro-image`) in Studio vs Flash (`gemini-3.1-flash-image`).
   *  Entitled for every plan; Stripe add-on remains for billing later if needed. */
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
    proImageModel: true,
  };
}

/** Plan allows the Pro image model (server-side gate for /api/generate-image). */
export function isProImagePlanEnabled(plan: PlanTier): boolean {
  return planFeatures(plan).proImageModel;
}

// ─────────────────────────────────────────────────────────────
//  Pro images add-on — solo users can buy Pro without going
//  Command. Entitlement = plan tier OR the org-level add-on flag
//  (stored in Organization.brandEngine.addons today; swaps to a
//  Stripe subscription item when billing lands).
// ─────────────────────────────────────────────────────────────

/** Monthly price (USD) for the Pro images add-on. Shown in upsell copy. */
export const PRO_IMAGES_ADDON_PRICE = 19;

/** Read the add-on flag out of the Organization.brandEngine JSON blob. */
export function hasProImagesAddon(brandEngine: unknown): boolean {
  if (!brandEngine || typeof brandEngine !== "object") return false;
  const addons = (brandEngine as Record<string, unknown>).addons;
  if (!addons || typeof addons !== "object") return false;
  return (addons as Record<string, unknown>).proImages === true;
}

/** Full Pro-images entitlement: plan tier OR purchased add-on. */
export function isProImageEntitled(plan: PlanTier, brandEngine: unknown): boolean {
  return isProImagePlanEnabled(plan) || hasProImagesAddon(brandEngine);
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
