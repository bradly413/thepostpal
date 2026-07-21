"use client";

import Link from "next/link";
import { VERTICALS } from "@/lib/verticals";

const STRIP_ORDER: string[] = [
  "realtors",
  "restaurants",
  "credit-unions-banks",
  "hvac-trades",
  "industrial",
  "salons",
  "local-services",
  "nonprofits",
  "multi-location",
];

const MOBILE_LABELS: Record<string, string> = {
  "credit-unions-banks": "Community banks",
  "hvac-trades": "HVAC & trades",
  industrial: "Industrial",
  salons: "Salons",
  "local-services": "Local services",
  "multi-location": "Multi-location",
};

/** Industry strip restyled for Codex paper chrome. */
export default function BuiltForStrip() {
  const items = STRIP_ORDER.map((slug) => VERTICALS.find((v) => v.slug === slug)).filter(
    (v): v is (typeof VERTICALS)[number] => Boolean(v),
  );

  return (
    <section className="pb-builtfor" aria-label="Industries posterboy serves">
      <p className="pb-builtfor-kicker">Built for</p>

      <div className="pb-builtfor-marquee">
        <div className="pb-builtfor-ticker">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? "true" : undefined}
              className="pb-builtfor-set"
            >
              {items.map((item) => (
                <Link
                  key={`${copy}-${item.slug}`}
                  href={`/for/${item.slug}`}
                  className="pb-builtfor-item"
                  tabIndex={copy === 1 ? -1 : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="pb-builtfor-grid">
        {items.map((item) => (
          <Link key={`mobile-${item.slug}`} href={`/for/${item.slug}`} className="pb-builtfor-chip">
            {MOBILE_LABELS[item.slug] ?? item.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
