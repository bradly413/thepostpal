import type { PlanTier } from "@prisma/client";
import { CONTACT_EMAIL } from "./site";
import { SIGNUP_SOLO_URL } from "./safe-redirect";

/** Self-serve and primary commercial tiers (June 2026 business plan). */
export type PricingTierId = "solo" | "command" | "brc-custom";

/** Legacy marketing/signup query params → current tier ids. */
export const LEGACY_PRICING_TIER_ALIASES: Record<string, PricingTierId> = {
  good: "solo",
  better: "solo",
  best: "solo",
  teams: "command",
  "house-account": "command",
};

export interface PricingTier {
  id: PricingTierId;
  name: string;
  price: string;
  priceNote?: string;
  /** Shown under price when annual billing is offered (Solo). */
  annualPriceNote?: string;
  description: string;
  bestFor: string;
  features: string[];
  cta: string;
  ctaHref: string;
  tier: "public" | "premium";
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "solo",
    name: "Solo",
    price: "$99",
    priceNote: "/mo",
    annualPriceNote: "or $79/mo when billed annually ($948/yr)",
    description:
      "One premium operator, one calm workspace. Three social profiles, brand consistency, and scheduling without the noise.",
    bestFor:
      "Independent luxury agents, solo aesthetic practitioners, and boutique consultants.",
    features: [
      "A private workspace of your own",
      "3 social profiles",
      "Creator Studio",
      "Auto captions that sound like you",
      "Bulk scheduling + calendar",
      "Brand voice training",
    ],
    cta: "Start Solo",
    ctaHref: SIGNUP_SOLO_URL,
    tier: "public",
  },
  {
    id: "command",
    name: "Command",
    price: "$249",
    priceNote: "/mo base + $39/location",
    description:
      "One bill, one login, many branded presences. Centralized approvals and roll-up visibility for multi-location brands.",
    bestFor:
      "Real estate brokerages, medical spa franchises, startup incubators, and multi-office operators.",
    features: [
      "Everything in Solo",
      "Multi-location rollup views",
      "Centralized team approval pipelines",
      "Agency-wide asset library",
      "Per-location brand kit and calendar",
      "Per-location social connections",
      "Guided team onboarding",
    ],
    cta: "Talk to us about Command",
    ctaHref: `mailto:${CONTACT_EMAIL}?subject=Command%20walkthrough`,
    tier: "public",
    highlighted: true,
  },
  {
    id: "brc-custom",
    name: "BRC Custom",
    price: "from $3,500",
    priceNote: "one-time",
    description:
      "Brand book, custom-branded portal, done-with-you content. For organizations that need a brand system, not just software.",
    bestFor:
      "Credit unions, banks, HVAC, industrial, and hospitality groups working with Bradly Robert Creative.",
    features: [
      "Brand Foundation: brand book + portal + first month done-for-you",
      "Brand + Quarterly Content packages",
      "Visual and voice systems",
      "Custom templates and launch kit",
      "Creative direction from BRC",
    ],
    cta: "Talk to BRC",
    ctaHref: `mailto:${CONTACT_EMAIL}?subject=BRC%20Custom`,
    tier: "premium",
  },
];

export function normalizePricingTierId(
  raw: string | null | undefined,
): PricingTierId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key in LEGACY_PRICING_TIER_ALIASES) {
    return LEGACY_PRICING_TIER_ALIASES[key];
  }
  const match = PRICING_TIERS.find((t) => t.id === key);
  return match?.id ?? null;
}

/** Maps checkout/marketing tier to Prisma `Organization.plan`. */
export function pricingTierToOrganizationPlan(
  tierId: PricingTierId,
): PlanTier | null {
  switch (tierId) {
    case "solo":
      return "solo";
    case "command":
      return "house_account";
    case "brc-custom":
      return null;
    default:
      return null;
  }
}

export function getPublicTiers(): PricingTier[] {
  return PRICING_TIERS.filter((t) => t.tier === "public");
}

export function getPremiumTiers(): PricingTier[] {
  return PRICING_TIERS.filter((t) => t.tier === "premium");
}

export function getTierById(id: string): PricingTier | undefined {
  const normalized = normalizePricingTierId(id);
  if (!normalized) return undefined;
  return PRICING_TIERS.find((t) => t.id === normalized);
}
