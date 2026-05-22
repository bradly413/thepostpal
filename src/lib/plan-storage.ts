import type { PricingTierId } from "./pricing";

const PLAN_KEY = "posterboy-selected-plan";

const VALID_PLANS = new Set<PricingTierId>([
  "good",
  "better",
  "best",
  "teams",
  "house-account",
  "brc-custom",
]);

export function saveSelectedPlan(plan: string | null | undefined): void {
  if (typeof window === "undefined" || !plan) return;
  if (!VALID_PLANS.has(plan as PricingTierId)) return;
  localStorage.setItem(PLAN_KEY, plan);
}

export function getSelectedPlan(): PricingTierId | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLAN_KEY);
  if (!raw || !VALID_PLANS.has(raw as PricingTierId)) return null;
  return raw as PricingTierId;
}

export function clearSelectedPlan(): void {
  localStorage.removeItem(PLAN_KEY);
}
