import {
  normalizePricingTierId,
  type PricingTierId,
} from "./pricing";

const PLAN_KEY = "posterboy-selected-plan";
const BILLING_KEY = "posterboy-selected-billing";

export type BillingCadence = "monthly" | "annual";

export function saveSelectedPlan(plan: string | null | undefined): void {
  if (typeof window === "undefined" || !plan) return;
  const normalized = normalizePricingTierId(plan);
  if (!normalized) return;
  localStorage.setItem(PLAN_KEY, normalized);
}

/**
 * Billing cadence chosen on the pricing page (Solo only today). Persisted so
 * the choice survives into signup; checkout reads it once the live billing
 * rail consumes cadence. INTEGRATION POINT: wire into checkout when billing
 * ships.
 */
export function saveSelectedBilling(billing: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (billing === "monthly" || billing === "annual") {
    localStorage.setItem(BILLING_KEY, billing);
  }
}

export function getSelectedBilling(): BillingCadence | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BILLING_KEY);
  return raw === "monthly" || raw === "annual" ? raw : null;
}

export function getSelectedPlan(): PricingTierId | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLAN_KEY);
  return normalizePricingTierId(raw);
}

export function clearSelectedPlan(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAN_KEY);
}
