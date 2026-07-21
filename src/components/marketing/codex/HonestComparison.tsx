"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

// Fair alternatives, no invented competitor prices. Each line concedes the
// real tradeoff; only Posterboy's own price appears.
const ALTERNATIVES = [
  { name: "Do it yourself", verdict: "Full control. It just costs your evenings." },
  { name: "Use a scheduler", verdict: "Organizes the work. You still have to make it." },
  { name: "Hire an agency", verdict: "Higher touch — with more cost and more meetings." },
  { name: "Go quiet", verdict: "Free, until the feed makes the business look closed." },
] as const;

/** The honest comparison — four struck-through options, one standing. */
export default function HonestComparison() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-alt-line, .pbv-alt-answer");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: root,
          start: "top 74%",
          end: "bottom 10%",
          toggleActions: "play none none reverse",
        },
      });
      tl.fromTo(
        root.querySelectorAll(".pbv-fade"),
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 },
      );
      tl.fromTo(
        root.querySelectorAll(".pbv-alt-line"),
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.13 },
        "-=0.15",
      );
      tl.fromTo(
        root.querySelector(".pbv-alt-answer"),
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.6 },
        "-=0.1",
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-alt" id="compare" aria-labelledby="pbv-alt-title" ref={rootRef}>
      <div className="pbv-alt-inner">
        <p className="pbv-kicker pbv-fade">The honest comparison</p>
        <h2 id="pbv-alt-title" className="pbv-fade">
          You can keep making the posts yourself. Posterboy exists so you don&rsquo;t have to.
        </h2>

        <ul className="pbv-alt-list">
          {ALTERNATIVES.map((alt) => (
            <li className="pbv-alt-line" key={alt.name}>
              <s className="pbv-alt-name">{alt.name}</s>
              <span className="pbv-alt-verdict">{alt.verdict}</span>
            </li>
          ))}
        </ul>

        <div className="pbv-alt-answer">
          <p className="pbv-alt-answer-name">
            poster<em>boy</em>
          </p>
          <p className="pbv-alt-answer-copy">
            Creates the work and keeps you in control. $99/mo. No meetings. No Sunday nights.
          </p>
          <p className="pbv-alt-answer-note">
            In practice: one post most weeks becomes three or four that sound like you.
            Illustrative — not reported customer results.
          </p>
          <Link
            href={SIGNUP_ONBOARDING_URL}
            className="pbv-alt-cta"
            onClick={() => track("start_trial_clicked", { location: "comparison" })}
          >
            Start free trial
          </Link>
        </div>
      </div>

      <style>{`
        .pbv-alt {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(88px, 13vh, 170px) clamp(20px, 3vw, 48px);
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-alt-inner { max-width: 880px; margin: 0 auto; }
        .pbv-alt h2 {
          margin: 0 0 48px;
          font-size: clamp(28px, 3.8vw, 46px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.08;
          color: var(--ink);
          max-width: 24ch;
        }
        .pbv-alt-list { list-style: none; margin: 0 0 40px; padding: 0; }
        .pbv-alt-line {
          display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
          padding: 18px 0;
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-alt-line:last-child { border-bottom: 1px solid rgba(20, 20, 24, 0.08); }
        .pbv-alt-name {
          font-size: clamp(21px, 2.4vw, 30px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--ink) 40%, transparent);
          text-decoration-thickness: 2px;
          text-decoration-color: color-mix(in srgb, var(--ink) 40%, transparent);
        }
        .pbv-alt-verdict {
          font-size: 15px;
          color: color-mix(in srgb, var(--ink) 58%, transparent);
        }
        .pbv-alt-answer { padding-top: 6px; }
        .pbv-alt-answer-name {
          margin: 0 0 10px;
          font-family: var(--font-instrument-serif), Georgia, serif;
          font-size: clamp(30px, 3.4vw, 42px);
          color: var(--ink);
          line-height: 1;
        }
        .pbv-alt-answer-name em { font-style: italic; }
        .pbv-alt-answer-copy {
          margin: 0 0 10px;
          font-size: clamp(17px, 1.6vw, 21px);
          font-weight: 600;
          color: var(--red);
          max-width: 40ch;
        }
        .pbv-alt-answer-note {
          margin: 0 0 24px;
          font-size: 13px;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
          max-width: 52ch;
        }
        .pbv-alt-cta {
          background: var(--ink); color: #fff;
          border-radius: 999px;
          padding: 0 28px; min-height: 52px;
          display: inline-flex; align-items: center;
          font-size: 15.5px; font-weight: 700;
          text-decoration: none;
          transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s ease;
        }
        .pbv-alt-cta:hover { background: #c81e2a; }
        .pbv-alt-cta:active { transform: scale(0.98); }
        .pbv-alt-cta:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
      `}</style>
    </section>
  );
}
