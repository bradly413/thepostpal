import { CONTACT_EMAIL } from "./site";

export type PricingTierId =
  | "good"
  | "better"
  | "best"
  | "teams"
  | "house-account"
  | "brc-custom";

export interface PricingTier {
  id: PricingTierId;
  name: string;
  price: string;
  priceNote?: string;
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
    id: "good",
    name: "Good",
    price: "$29",
    priceNote: "/mo",
    description: "One business, one user, three social accounts. Enough to show up.",
    bestFor: "Solo operators who need to post consistently without thinking about it.",
    features: [
      "1 user",
      "3 social accounts",
      "30 AI-drafted posts/month",
      "Auto-scheduling",
      "One-tap approvals",
      "Library access",
      "Email reminders",
    ],
    cta: "Start with Good",
    ctaHref: "/sign-in?mode=signup&next=%2Fonboarding&plan=good",
    tier: "public",
  },
  {
    id: "better",
    name: "Better",
    price: "$59",
    priceNote: "/mo",
    description: "Unlimited posts, brand voice training, the photo library. Most people land here.",
    bestFor: "Operators who want the week handled and the brand voice learned.",
    features: [
      "1 user",
      "Unlimited social accounts",
      "Unlimited AI-drafted posts",
      "Brand voice training",
      "Photo library",
      "Priority scheduling",
      "Monthly report",
    ],
    cta: "Choose Better",
    ctaHref: "/sign-in?mode=signup&next=%2Fonboarding&plan=better",
    tier: "public",
    highlighted: true,
  },
  {
    id: "best",
    name: "Best",
    price: "$99",
    priceNote: "/mo",
    description: "Premium AI, white-glove onboarding, the support line that picks up.",
    bestFor: "Serious operators who want a calm month and a real strategy.",
    features: [
      "Everything in Better",
      "Premium AI models",
      "Custom templates",
      "White-glove onboarding",
      "Priority support",
      "Quarterly strategy call",
    ],
    cta: "Choose Best",
    ctaHref: "/sign-in?mode=signup&next=%2Fonboarding&plan=best",
    tier: "public",
  },
  {
    id: "teams",
    name: "Teams",
    price: "from $199",
    priceNote: "/mo",
    description: "Up to 5, 10, or 25 seats on one brand. Admin controls. Real role permissions.",
    bestFor: "Internal marketing teams, in-house creators, and small agencies on one brand.",
    features: [
      "Up to 5 / 10 / 25 seats",
      "Shared brand kit",
      "Role permissions",
      "Audit log",
      "Dedicated onboarding (10+ seats)",
      "Custom branding (25 seats)",
      "SSO (25 seats)",
    ],
    cta: "Compare team sizes",
    ctaHref: `mailto:${CONTACT_EMAIL}?subject=Teams`,
    tier: "premium",
  },
  {
    id: "house-account",
    name: "House Account",
    price: "$499",
    priceNote: "/mo + $49/location",
    description: "One corporate bill. One log-in. Many branded presences. Approvals before publish.",
    bestFor: "Restaurant groups, bank and credit-union networks, franchise operators, multi-office brokerages.",
    features: [
      "3 locations included",
      "Per-location brand kit and calendar",
      "Per-location social connections",
      "Corporate approval workflow",
      "Cross-location publishing",
      "Roll-up reporting",
      "SSO + audit log",
      "Unlimited seats",
    ],
    cta: "Open a House Account",
    ctaHref: `mailto:${CONTACT_EMAIL}?subject=House%20Account`,
    tier: "premium",
  },
  {
    id: "brc-custom",
    name: "BRC Custom",
    price: "from $3,500",
    priceNote: "one-time",
    description: "Brand book, custom-branded portal, done-with-you content. The kind of thing a dashboard alone can't deliver.",
    bestFor: "Credit unions, banks, HVAC, industrial, hospitality groups that need a brand system, not just software.",
    features: [
      "Brand Foundation: $3,500 one-time (brand book + portal + first month done-for-you)",
      "Brand + Quarterly Content: $7,500/qtr (ongoing content via BRC)",
      "Visual system",
      "Voice system",
      "Custom templates",
      "Launch kit",
      "Creative direction from Bradly Robert Creative",
    ],
    cta: "Talk to BRC",
    ctaHref: `mailto:${CONTACT_EMAIL}?subject=BRC%20Custom`,
    tier: "premium",
  },
];

export function getPublicTiers(): PricingTier[] {
  return PRICING_TIERS.filter((t) => t.tier === "public");
}

export function getPremiumTiers(): PricingTier[] {
  return PRICING_TIERS.filter((t) => t.tier === "premium");
}

export function getTierById(id: PricingTierId): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === id);
}
