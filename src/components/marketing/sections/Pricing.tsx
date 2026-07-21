"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { getPublicTiers } from "@/lib/pricing";
import { CONTACT_EMAIL } from "@/lib/site";
import { track } from "@/lib/marketing/track";

const PUBLIC_TIERS = getPublicTiers();

const TIER_NOTES: Record<string, string> = {
  solo: "premium solo",
  command: "multi-location",
};

// Verified against src/lib/pricing.ts: Solo $99/mo, or $79/mo billed annually
// ($948/yr vs $1,188 — exactly 20% off). Command $249/mo base + $39/location,
// monthly only; the billing toggle is scoped to Solo and says so.
const SOLO_MONTHLY = 99;
const SOLO_ANNUAL_PER_MONTH = 79;
const SOLO_ANNUAL_TOTAL = SOLO_ANNUAL_PER_MONTH * 12; // $948
// Exact arithmetic, not a rounded percentage: $1,188 − $948 = $240/yr.
const SOLO_SAVINGS_DOLLARS = SOLO_MONTHLY * 12 - SOLO_ANNUAL_TOTAL; // 240

type Cadence = "monthly" | "annual";

/** Homepage pricing: two software plans + a clearly separate BRC service path. */
export default function Pricing() {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const toggleId = useId();

  const setBilling = (next: Cadence) => {
    setCadence(next);
    track("pricing_billing_changed", { billing: next });
  };

  return (
    <section className="pb-pricing" id="pricing" aria-labelledby="pb-pricing-title">
      <div className="pb-pricing-head">
        <p className="pb-pricing-kicker">Pricing</p>
        <h2 id="pb-pricing-title">Pick the version that matches the business.</h2>
        <p className="pb-pricing-sub">Less than one Sunday night, every month.</p>

        <div
          className="pb-billing-toggle"
          role="group"
          aria-labelledby={`${toggleId}-label`}
        >
          <span id={`${toggleId}-label`} className="pb-billing-label">
            Solo billing
          </span>
          <button
            type="button"
            className={`pb-billing-btn${cadence === "monthly" ? " is-on" : ""}`}
            aria-pressed={cadence === "monthly"}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`pb-billing-btn${cadence === "annual" ? " is-on" : ""}`}
            aria-pressed={cadence === "annual"}
            onClick={() => setBilling("annual")}
          >
            Annual <span className="pb-billing-save">save ${SOLO_SAVINGS_DOLLARS}/yr</span>
          </button>
        </div>
      </div>

      <div className="pb-pricing-grid">
        {PUBLIC_TIERS.map((tier) => {
          const isSolo = tier.id === "solo";
          const showAnnual = isSolo && cadence === "annual";
          const priceNum = showAnnual ? `$${SOLO_ANNUAL_PER_MONTH}` : tier.price;
          const priceNote = showAnnual ? "/mo billed annually" : tier.priceNote;
          const ctaHref = isSolo ? `${tier.ctaHref}&billing=${cadence}` : tier.ctaHref;
          return (
            <article
              key={tier.id}
              className={`pb-price-card${tier.highlighted ? " is-highlight" : ""}`}
            >
              <header className="pb-price-card-top">
                <h3>{tier.name}</h3>
                <span className="pb-price-note">{TIER_NOTES[tier.id] ?? ""}</span>
              </header>
              <p className="pb-price-amount">
                <span className="pb-price-num">{priceNum}</span>
                {priceNote ? <span className="pb-price-unit">{priceNote}</span> : null}
              </p>
              {isSolo ? (
                <p className="pb-price-annual">
                  {showAnnual
                    ? `$${SOLO_ANNUAL_TOTAL}/yr up front · $${SOLO_MONTHLY}/mo if billed monthly`
                    : tier.annualPriceNote}
                </p>
              ) : (
                <p className="pb-price-annual">Billed monthly · scales by location</p>
              )}
              <p className="pb-price-desc">
                {isSolo
                  ? "For one business that needs the feed handled."
                  : "For teams managing multiple locations without losing the local voice."}
              </p>
              <ul className="pb-price-features">
                {tier.features.map((f) => (
                  <li key={f}>
                    <Check size={14} aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                className="pb-price-cta"
                onClick={() =>
                  track("pricing_plan_selected", { plan: tier.id, billing: isSolo ? cadence : "monthly" })
                }
              >
                {tier.cta}
              </Link>
              <p className="pb-price-terms">
                {isSolo
                  ? "Free to start. No credit card required."
                  : "Set up with our team — walkthrough first, then onboarding."}
              </p>
            </article>
          );
        })}
      </div>

      <p className="pb-pricing-foot">
        Need done-with-you brand work?{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=BRC%20Custom`}>BRC Custom</a> is a separate
        service from Bradly Robert Creative — not a software tier. Full details on{" "}
        <Link href="/pricing">/pricing</Link>.
      </p>

      <style>{`
        .pb-billing-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 20px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(20,20,24,0.1);
          border-radius: 999px;
          padding: 5px 6px 5px 14px;
        }
        .pb-billing-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: color-mix(in srgb, #141418 50%, transparent);
        }
        .pb-billing-btn {
          border: 0; background: transparent;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 13.5px; font-weight: 600;
          color: color-mix(in srgb, #141418 60%, transparent);
          cursor: pointer;
          min-height: 38px;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .pb-billing-btn.is-on { background: #141418; color: #fff; }
        .pb-billing-btn:focus-visible { outline: 2px solid #ee2532; outline-offset: 2px; }
        .pb-billing-save {
          font-size: 11px; font-weight: 700;
          color: #ee2532;
          margin-left: 4px;
        }
        .pb-billing-btn.is-on .pb-billing-save { color: #ffb3ba; }
        .pb-price-terms {
          margin: 10px 0 0;
          font-size: 12px;
          color: color-mix(in srgb, #141418 52%, transparent);
        }
      `}</style>
    </section>
  );
}
