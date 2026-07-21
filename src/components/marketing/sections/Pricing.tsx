"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { getPublicTiers } from "@/lib/pricing";
import { CONTACT_EMAIL } from "@/lib/site";

const PUBLIC_TIERS = getPublicTiers();

const TIER_NOTES: Record<string, string> = {
  solo: "premium solo",
  command: "multi-location",
};

/** Codex-chrome pricing strip for the marketing homepage embed. */
export default function Pricing() {
  return (
    <section className="pb-pricing" id="pricing" aria-labelledby="pb-pricing-title">
      <div className="pb-pricing-head">
        <p className="pb-pricing-kicker">Pricing</p>
        <h2 id="pb-pricing-title">
          Solo. <strong>Command.</strong>
        </h2>
        <p className="pb-pricing-sub">
          Two tiers. No paralysis. Premium operators and multi-location brands on
          the same calm platform.
        </p>
      </div>

      <div className="pb-pricing-grid">
        {PUBLIC_TIERS.map((tier) => (
          <article
            key={tier.id}
            className={`pb-price-card${tier.highlighted ? " is-highlight" : ""}`}
          >
            <header className="pb-price-card-top">
              <h3>{tier.name}</h3>
              <span className="pb-price-note">{TIER_NOTES[tier.id] ?? ""}</span>
            </header>
            <p className="pb-price-amount">
              <span className="pb-price-num">{tier.price}</span>
              {tier.priceNote ? (
                <span className="pb-price-unit">{tier.priceNote}</span>
              ) : null}
            </p>
            {tier.annualPriceNote ? (
              <p className="pb-price-annual">{tier.annualPriceNote}</p>
            ) : null}
            <p className="pb-price-desc">{tier.description}</p>
            <ul className="pb-price-features">
              {tier.features.map((f) => (
                <li key={f}>
                  <Check size={14} aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href={tier.ctaHref} className="pb-price-cta">
              {tier.cta}
            </Link>
          </article>
        ))}
      </div>

      <p className="pb-pricing-foot">
        Need done-with-you brand work?{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=BRC%20Custom`}>BRC Custom</a>.
        Full details on <Link href="/pricing">/pricing</Link>.
      </p>
    </section>
  );
}
