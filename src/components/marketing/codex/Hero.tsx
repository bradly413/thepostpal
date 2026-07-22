"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";
import { goToDemo, PRIMARY_CTA } from "@/lib/marketing/demo-intake";
import { VERTICALS } from "@/lib/verticals";

const TRUST_SLUGS = [
  "restaurants",
  "realtors",
  "salons",
  "hvac-trades",
  "local-services",
  "multi-location",
] as const;

/**
 * Centered hero — month-out scheduling, Studio, voice captions, one-click publish.
 */
export default function Hero() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  const trust = TRUST_SLUGS.map((slug) => VERTICALS.find((v) => v.slug === slug)).filter(
    (v): v is (typeof VERTICALS)[number] => Boolean(v),
  );

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo(
        bits,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.08 },
      );
      const failsafe = setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 2500);
      return () => clearTimeout(failsafe);
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="hero pbv-hero" id="hero" aria-labelledby="pbv-hero-title" ref={rootRef}>
      <div className="pbv-hero-inner">
        <p className="pbv-hero-brand pbv-fade" aria-hidden="true">
          poster<em>boy</em>
        </p>
        <p className="pbv-hero-kicker pbv-fade">Create. Caption. Schedule. Publish.</p>
        <h1 id="pbv-hero-title" className="pbv-hero-title pbv-fade">
          Social media management
          <br />
          for people who don&apos;t want to
          <br />
          manage social media
        </h1>
        <p className="pbv-hero-sub pbv-fade">
          Make content in Creator Studio, bulk-schedule with auto captions that sound like you,
          and publish to Facebook and Instagram in one click — as far ahead as you want.
        </p>
        <div className="pbv-hero-ctas pbv-fade">
          <button
            type="button"
            className="pbv-btn"
            onClick={() => {
              track("hero_demo_started", { location: "hero" });
              goToDemo();
            }}
          >
            {PRIMARY_CTA}
          </button>
          <Link
            href={SIGNUP_ONBOARDING_URL}
            className="pbv-link"
            onClick={() => track("start_trial_clicked", { location: "hero_secondary" })}
          >
            Join free beta
          </Link>
        </div>
        <p className="pbv-hero-terms pbv-fade">Closed beta · free · no card required.</p>

        <div className="pbv-hero-trust pbv-fade" aria-label="Built for local businesses">
          <p className="pbv-hero-trust-line">
            Built for owners who would rather run the business than the feed.
          </p>
          <div className="pbv-hero-trust-row">
            {trust.map((item) => (
              <Link key={item.slug} href={`/for/${item.slug}`} className="pbv-hero-trust-item">
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .cx .pbv-hero {
          --red: #ee2532;
          --ink: #141418;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: min(78svh, 760px);
          padding: clamp(48px, 9vh, 110px) 0 clamp(28px, 5vh, 48px);
        }
        .cx .pbv-hero-inner {
          max-width: 860px;
          margin: 0 auto;
          padding: 0 clamp(20px, 3vw, 48px);
          width: 100%;
          text-align: center;
        }
        .cx .pbv-hero-brand {
          font-family: var(--font-instrument-serif), Georgia, serif;
          font-size: clamp(22px, 1.8vw, 28px);
          margin: 0 0 14px;
          color: var(--ink);
        }
        .cx .pbv-hero-brand em { font-style: italic; color: var(--red); }
        .cx .pbv-hero-kicker {
          margin: 0 0 14px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
        }
        .cx .pbv-hero .pbv-hero-title {
          font-family: var(--font-instrument-sans), Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(32px, 4.2vw, 52px);
          font-weight: 750;
          letter-spacing: -0.04em;
          line-height: 1.12;
          margin: 0 auto 20px;
          color: var(--ink);
          max-width: 30ch;
          text-wrap: balance;
        }
        .cx .pbv-hero-sub {
          font-size: clamp(16px, 1.35vw, 19px);
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 58%, transparent);
          margin: 0 auto 28px;
          max-width: 48ch;
        }
        .cx .pbv-hero-ctas {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          flex-wrap: wrap;
        }
        .cx .pbv-btn {
          background: var(--red); color: #fff;
          border: 0; border-radius: 999px;
          padding: 0 28px; min-height: 52px;
          display: inline-flex; align-items: center;
          font-size: 15.5px; font-weight: 700; letter-spacing: 0.01em;
          text-decoration: none; cursor: pointer;
          transition: background 0.25s ease, transform 0.15s ease;
          box-shadow: 0 14px 36px -18px rgba(200, 30, 42, 0.55);
        }
        .cx .pbv-btn:hover { background: #c81e2a; }
        .cx .pbv-btn:active { transform: scale(0.98); }
        .cx .pbv-btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .cx .pbv-link {
          color: var(--ink);
          font-size: 15px; font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 5px;
          text-decoration-color: color-mix(in srgb, var(--ink) 28%, transparent);
        }
        .cx .pbv-link:hover { text-decoration-color: var(--ink); }
        .cx .pbv-hero-terms {
          margin: 18px 0 0;
          font-size: 13px;
          color: color-mix(in srgb, var(--ink) 42%, transparent);
        }
        .cx .pbv-hero-trust {
          margin-top: clamp(48px, 8vh, 72px);
          padding-top: 28px;
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .cx .pbv-hero-trust-line {
          margin: 0 0 16px;
          font-size: 13px;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
        }
        .cx .pbv-hero-trust-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 18px;
        }
        .cx .pbv-hero-trust-item {
          font-size: 11.5px;
          font-weight: 650;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 38%, transparent);
          text-decoration: none;
        }
        .cx .pbv-hero-trust-item:hover { color: var(--red); }
        @media (max-width: 900px) {
          .cx .pbv-hero { min-height: 0; }
        }
      `}</style>
    </section>
  );
}
