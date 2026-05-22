"use client";

import Link from "next/link";
import { VERTICALS } from "@/lib/verticals";

// Display order — most-recognized first.
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

// Font style variation per item, so the ticker has rhythm.
const FONT_VARIANTS: Array<{ fontFamily: string; fontWeight: number }> = [
  { fontFamily: "var(--font-sans)", fontWeight: 400 },
  { fontFamily: "var(--font-playfair-display)", fontWeight: 700 },
  { fontFamily: "var(--font-instrument-serif)", fontWeight: 400 },
  { fontFamily: "var(--font-sans)", fontWeight: 600 },
  { fontFamily: "var(--font-playfair)", fontWeight: 600 },
  { fontFamily: "var(--font-instrument-serif)", fontWeight: 400 },
  { fontFamily: "var(--font-sans)", fontWeight: 700 },
  { fontFamily: "var(--font-playfair-display)", fontWeight: 400 },
  { fontFamily: "var(--font-sans)", fontWeight: 500 },
];

export default function BuiltForStrip() {
  const items = STRIP_ORDER
    .map((slug) => VERTICALS.find((v) => v.slug === slug))
    .filter((v): v is (typeof VERTICALS)[number] => Boolean(v))
    .map((v, i) => ({ ...v, font: FONT_VARIANTS[i % FONT_VARIANTS.length] }));

  return (
    <section
      aria-label="Industries posterboy serves"
      style={{
        background: "#FFFFFF",
        padding: "clamp(48px, 7vh, 88px) 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "2.2em" }}>
        <p
          style={{
            textTransform: "uppercase",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "var(--quiet-sage)",
            margin: 0,
            fontFamily: "var(--font-sans)",
          }}
        >
          Built for
        </p>
      </div>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
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
                  style={{
                    fontFamily: item.font.fontFamily,
                    fontWeight: item.font.fontWeight,
                  }}
                  tabIndex={copy === 1 ? -1 : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .pb-builtfor-ticker {
          display: flex;
          gap: 64px;
          align-items: center;
          width: max-content;
          animation: pb-builtfor-marquee 42s linear infinite;
          will-change: transform;
        }
        .pb-builtfor-ticker:hover {
          animation-play-state: paused;
        }
        .pb-builtfor-set {
          display: flex;
          gap: 64px;
          align-items: center;
          flex-shrink: 0;
          padding-left: 32px;
        }
        .pb-builtfor-item {
          color: var(--ink);
          text-decoration: none;
          font-size: clamp(18px, 1.6vw, 24px);
          letter-spacing: -0.01em;
          transition: opacity 0.2s ease;
          opacity: 0.72;
          white-space: nowrap;
        }
        .pb-builtfor-item:hover {
          opacity: 1;
        }
        @keyframes pb-builtfor-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pb-builtfor-ticker {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
