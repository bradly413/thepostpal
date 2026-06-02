import {
  normalizePricingTierId,
  type PricingTierId,
} from "./pricing";

const PLAN_KEY = "posterboy-selected-plan";

export function saveSelectedPlan(plan: string | null | undefined): void {
  if (typeof window === "undefined" || !plan) return;
  const normalized = normalizePricingTierId(plan);
  if (!normalized) return;
  localStorage.setItem(PLAN_KEY, normalized);
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
