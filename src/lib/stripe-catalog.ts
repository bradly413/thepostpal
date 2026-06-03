import {
  normalizePricingTierId,
  pricingTierToOrganizationPlan,
  type PricingTierId,
} from "@/lib/pricing";
import type { PlanTier } from "@prisma/client";

export interface StripePriceCatalog {
  soloMonthly: string | null;
  soloAnnual: string | null;
  commandBaseMonthly: string | null;
  commandLocationMonthly: string | null;
}

export function getStripePriceCatalog(): StripePriceCatalog {
  return {
    soloMonthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || null,
    soloAnnual: process.env.STRIPE_PRICE_SOLO_ANNUAL || null,
    commandBaseMonthly: process.env.STRIPE_PRICE_COMMAND_BASE_MONTHLY || null,
    commandLocationMonthly: process.env.STRIPE_PRICE_COMMAND_LOCATION_MONTHLY || null,
  };
}

export function stripePriceIdForTier(
  tierId: PricingTierId,
  billingInterval: "monthly" | "annual" = "monthly",
): string | null {
  const catalog = getStripePriceCatalog();
  if (tierId === "solo") {
    return billingInterval === "annual"
      ? catalog.soloAnnual
      : catalog.soloMonthly;
  }
  if (tierId === "command") {
    return billingInterval === "monthly" ? catalog.commandBaseMonthly : null;
  }
  return null;
}

export function planTierFromStripePriceId(priceId: string): PlanTier | null {
  const catalog = getStripePriceCatalog();
  if (
    priceId === catalog.soloMonthly ||
    priceId === catalog.soloAnnual
  ) {
    return pricingTierToOrganizationPlan("solo");
  }
  if (
    priceId === catalog.commandBaseMonthly ||
    priceId === catalog.commandLocationMonthly
  ) {
    return pricingTierToOrganizationPlan("command");
  }
  return null;
}

export function normalizeCheckoutTier(
  raw: string | null | undefined,
): PricingTierId | null {
  return normalizePricingTierId(raw);
}

export function commandLocationPriceId(): string | null {
  return getStripePriceCatalog().commandLocationMonthly;
}
