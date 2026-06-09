import type { PlanTier } from "@prisma/client";
import { isMultiLocationPlan } from "@/lib/plan-features";

const LABELS: Record<PlanTier, string> = {
  solo: "Solo",
  shop: "Shop",
  press: "Press",
  studio: "Studio",
  house_account: "Command",
  brc_custom: "BRC Custom",
};

export function planDisplayName(plan: PlanTier | null | undefined): string {
  if (!plan) return "Solo";
  return LABELS[plan] ?? "Solo";
}

export function isCommandPlan(plan: PlanTier | null | undefined): boolean {
  if (!plan) return false;
  return isMultiLocationPlan(plan);
}
