"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { goToDemo, PRIMARY_CTA } from "@/lib/marketing/demo-intake";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

const COLUMNS = [
  {
    id: "diy",
    name: "DIY tools",
    verdict: "You still create, caption, and schedule every post yourself.",
    highlight: false,
  },
  {
    id: "agency",
    name: "Agencies",
    verdict: "Higher cost, slower feedback, and less day-to-day control.",
    highlight: false,
  },
  {
    id: "posterboy",
    name: "Posterboy",
    verdict:
      "Studio, auto captions in your voice, bulk schedule as far as you want, one-click publish. Solo from $99/mo.",
    highlight: true,
  },
] as const;

/** Three-way comparison — Posterboy as the saturated red field. */
export default function HonestComparison() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-cmp-col");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        bits,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 74%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-cmp" id="compare" aria-labelledby="pbv-cmp-title" ref={rootRef}>
      <div className="pbv-cmp-inner">
        <p className="pbv-kicker pbv-fade">The honest comparison</p>
        <h2 id="pbv-cmp-title" className="pbv-fade">
          Every option leaves the owner doing the hard part.
        </h2>

        <div className="pbv-cmp-grid">
          {COLUMNS.map((col) => (
            <article
              key={col.id}
              className={`pbv-cmp-col${col.highlight ? " is-pb" : ""}`}
            >
              <h3>{col.name}</h3>
              <p>{col.verdict}</p>
              {col.highlight ? (
                <button
                  type="button"
                  className="pbv-cmp-cta"
                  onClick={() => {
                    track("hero_demo_started", { location: "comparison" });
                    goToDemo();
                  }}
                >
                  {PRIMARY_CTA}
                </button>
              ) : null}
            </article>
          ))}
        </div>
        <p className="pbv-cmp-note pbv-fade">
          Price is Solo monthly. Nothing publishes without approval.
        </p>
      </div>

      <style>{`
        .pbv-cmp {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(56px, 9vh, 120px) clamp(16px, 2.5vw, 36px);
        }
        .pbv-cmp-inner { max-width: 1100px; margin: 0 auto; }
        .pbv-kicker {
          margin: 0 0 12px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
        }
        .pbv-cmp h2 {
          margin: 0 0 clamp(28px, 4vw, 40px);
          font-size: clamp(28px, 3.8vw, 46px);
          font-weight: 750;
          letter-spacing: -0.03em;
          line-height: 1.08;
          color: var(--ink);
          max-width: 18ch;
        }
        .pbv-cmp-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .pbv-cmp-col {
          padding: clamp(22px, 3vw, 32px);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-cmp-col h3 {
          margin: 0 0 10px;
          font-size: 15px;
          font-weight: 750;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .pbv-cmp-col p {
          margin: 0;
          font-size: 15.5px;
          line-height: 1.5;
          color: color-mix(in srgb, var(--ink) 62%, transparent);
        }
        .pbv-cmp-col.is-pb {
          background: var(--red);
          border-color: transparent;
          color: #fff;
        }
        .pbv-cmp-col.is-pb p { color: rgba(255, 255, 255, 0.9); }
        .pbv-cmp-cta {
          margin-top: 22px;
          background: #fff;
          color: var(--ink);
          border: 0;
          border-radius: 999px;
          padding: 0 22px;
          min-height: 46px;
          font-size: 14.5px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .pbv-cmp-cta:hover { transform: translateY(-1px); }
        .pbv-cmp-cta:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .pbv-cmp-note {
          margin: 18px 4px 0;
          font-size: 12.5px;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
        }
        @media (max-width: 820px) {
          .pbv-cmp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
