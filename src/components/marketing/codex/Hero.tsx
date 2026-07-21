"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";

/**
 * Hero — the done-for-you promise, nothing else.
 * No form, no imagery, no choices. One red CTA; the demo lives one anchor away.
 * Trial line is the verified truth: signup is free and collects no card.
 */
export default function Hero() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion, scrollToAnchor } = useMarketingScroll();

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
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 },
      );
      // Failsafe: if the tab's animation frames are throttled (background tab)
      // the timeline stalls — timers still fire, so snap the hero visible
      // rather than leaving above-the-fold content faded out. A healthy run
      // finishes in ~1.2s, so anything unfinished at 2.5s is stalled.
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
        <h1 id="pbv-hero-title" className="pbv-hero-title pbv-fade">
          You run the place.
          <br />
          We&rsquo;ll run the feed.
        </h1>
        <p className="pbv-hero-sub pbv-fade">
          Posterboy learns your business, writes the posts, creates the visuals, and keeps the week
          moving. You approve what you like and get back to work.
        </p>
        <div className="pbv-hero-ctas pbv-fade">
          <Link
            href={SIGNUP_ONBOARDING_URL}
            className="pbv-btn"
            onClick={() => track("start_trial_clicked", { location: "hero" })}
          >
            Start free trial
          </Link>
          <a
            href="#demo"
            className="pbv-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToAnchor("#demo");
              track("hero_demo_started", { location: "hero_watch_link" });
            }}
          >
            Watch Posterboy work
          </a>
        </div>
        <p className="pbv-hero-terms pbv-fade">Free to start. No card required.</p>
      </div>

      <style>{`
        .cx .pbv-hero {
          --red: #ee2532;
          --ink: #141418;
          display: flex;
          align-items: center;
          min-height: min(74svh, 720px);
          padding: clamp(40px, 8vh, 96px) 0;
        }
        .cx .pbv-hero-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 clamp(20px, 3vw, 48px);
          width: 100%;
        }
        .cx .pbv-hero-brand {
          font-family: var(--font-instrument-serif), Georgia, serif;
          font-size: clamp(20px, 1.6vw, 24px);
          margin: 0 0 26px;
          color: var(--ink);
        }
        .cx .pbv-hero-brand em { font-style: italic; }
        .cx .pbv-hero .pbv-hero-title {
          font-family: var(--font-instrument-sans), Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(52px, 7.2vw, 96px);
          font-weight: 700;
          letter-spacing: -0.045em;
          line-height: 0.99;
          margin: 0 0 26px;
          color: var(--ink);
          white-space: normal;
          max-width: none;
        }
        .cx .pbv-hero-sub {
          font-size: clamp(17px, 1.4vw, 21px);
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 62%, transparent);
          margin: 0 0 34px;
          max-width: 52ch;
        }
        .cx .pbv-hero-ctas { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; }
        .cx .pbv-btn {
          background: var(--red); color: #fff;
          border: 0; border-radius: 999px;
          padding: 0 30px; min-height: 54px;
          display: inline-flex; align-items: center;
          font-size: 16px; font-weight: 700; letter-spacing: 0.01em;
          text-decoration: none; cursor: pointer;
          transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s ease;
        }
        .cx .pbv-btn:hover { background: #c81e2a; }
        .cx .pbv-btn:active { transform: scale(0.98); }
        .cx .pbv-btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .cx .pbv-link {
          color: var(--ink);
          font-size: 15.5px; font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 5px;
          text-decoration-color: color-mix(in srgb, var(--ink) 30%, transparent);
          transition: text-decoration-color 0.25s ease;
        }
        .cx .pbv-link:hover { text-decoration-color: var(--ink); }
        .cx .pbv-link:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
        .cx .pbv-hero-terms {
          margin: 22px 0 0;
          font-size: 13px;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
        }
        @media (max-width: 900px) {
          .cx .pbv-hero { min-height: 0; }
        }
      `}</style>
    </section>
  );
}
