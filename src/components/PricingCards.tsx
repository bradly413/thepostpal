import Link from "next/link";
import type { PricingTier } from "@/lib/pricing";

interface PricingCardsProps {
  tiers: PricingTier[];
  showTierLabel?: boolean;
}

export default function PricingCards({ tiers, showTierLabel }: PricingCardsProps) {
  return (
    <div className="pb-pricing-grid">
      {tiers.map((tier) => (
        <article
          key={tier.id}
          id={tier.id}
          className={`pb-pricing-card ${tier.highlighted ? "pb-pricing-card-highlight" : ""}`}
        >
          {showTierLabel && (
            <p className="pb-pricing-tier-label">
              {tier.tier === "premium" ? "Premium" : "Public"}
            </p>
          )}
          <h3 className="pb-pricing-name">{tier.name}</h3>
          <p className="pb-pricing-price">
            {tier.price}
            {tier.priceNote && <span>{tier.priceNote}</span>}
          </p>
          <p className="pb-pricing-desc">{tier.description}</p>
          <p className="pb-pricing-best">
            <span>Best for</span> {tier.bestFor}
          </p>
          <ul className="pb-pricing-features">
            {tier.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Link
            href={tier.ctaHref}
            className={tier.tier === "premium" ? "pb-btn-secondary" : "pb-btn-primary"}
          >
            {tier.cta}
          </Link>
        </article>
      ))}
    </div>
  );
}
