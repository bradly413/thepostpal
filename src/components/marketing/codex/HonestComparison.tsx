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

// Row copy carried over verbatim from the original comparison (source of truth).
const OPTIONS = [
  {
    name: "Do it yourself",
    cost: "$30/mo + your evenings",
    copy:
      "Buffer, Canva, a content calendar, and every Sunday night for the rest of your life. The tools schedule. You still do the work.",
  },
  {
    name: "Hire an agency",
    cost: "$1,500+/mo + meetings",
    copy:
      "Great work, eventually. After the onboarding call, the strategy deck, the revision rounds, and the invoice.",
  },
  {
    name: "Go quiet",
    cost: "$0 + your customers",
    copy: "The cheapest option, until it isn't. A silent feed reads as a closed business.",
  },
] as const;

/** Four honest rows; the fourth is the answer — distinct but not a gimmick. */
export default function HonestComparison() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const rows = root.querySelectorAll<HTMLElement>(".pbx-alt-row, .pbx-alt-answer");
      const head = root.querySelector<HTMLElement>(".pbx-alt-head");

      if (reducedMotion) {
        gsap.set([head, ...Array.from(rows)].filter(Boolean), { opacity: 1, y: 0, x: 0 });
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
      if (head) tl.fromTo(head, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.55 });
      rows.forEach((row, i) => {
        tl.fromTo(
          row,
          { autoAlpha: 0, x: -22 },
          { autoAlpha: 1, x: 0, duration: 0.5 },
          0.25 + i * 0.16,
        );
        const num = row.querySelector(".pbx-alt-num");
        if (num) {
          tl.fromTo(
            num,
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.4 },
            0.3 + i * 0.16,
          );
        }
      });
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbx-alt" id="compare" aria-labelledby="pbx-alt-title" ref={rootRef}>
      <div className="pbx-alt-head">
        <p className="pbx-alt-kicker">The honest comparison</p>
        <h2 id="pbx-alt-title">
          You have <strong>three options.</strong>
        </h2>
      </div>

      <div className="pbx-alt-rows">
        {OPTIONS.map((o, i) => (
          <div className="pbx-alt-row" key={o.name}>
            <span className="pbx-alt-num" aria-hidden>
              0{i + 1}
            </span>
            <div className="pbx-alt-body">
              <h3 className="pbx-alt-name">{o.name}</h3>
              <p className="pbx-alt-copy">{o.copy}</p>
            </div>
            <span className="pbx-alt-cost">{o.cost}</span>
          </div>
        ))}

        <div className="pbx-alt-answer">
          <span className="pbx-alt-num pbx-alt-num--red" aria-hidden>
            04
          </span>
          <div className="pbx-alt-body">
            <p className="pbx-alt-answer-tag">The answer</p>
            <h3 className="pbx-alt-answer-title">
              Or: posterboy writes, schedules, and publishes in your voice. You approve from your
              phone.
            </h3>
            <p className="pbx-alt-answer-cost">$99/mo. No meetings. No Sunday nights.</p>
          </div>
          <Link
            href={SIGNUP_ONBOARDING_URL}
            className="pbx-alt-cta"
            onClick={() => track("start_trial_clicked", { location: "comparison" })}
          >
            Start free trial
          </Link>
        </div>
      </div>

      <style>{`
        .pbx-alt {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(72px, 11vh, 140px) clamp(20px, 3vw, 48px);
          max-width: 1080px;
          margin: 0 auto;
        }
        .pbx-alt-kicker {
          margin: 0 0 14px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-alt h2 {
          margin: 0 0 40px;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 700; letter-spacing: -0.025em; line-height: 1.06;
          color: var(--ink);
        }
        .pbx-alt h2 strong { color: var(--red); }
        .pbx-alt-rows { display: flex; flex-direction: column; gap: 12px; }
        .pbx-alt-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: clamp(16px, 3vw, 36px);
          align-items: center;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(20,20,24,0.08);
          border-radius: 18px;
          padding: clamp(18px, 2.4vw, 26px);
        }
        .pbx-alt-num {
          font-size: clamp(22px, 2.4vw, 30px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--ink) 28%, transparent);
          font-variant-numeric: tabular-nums;
          min-width: 2ch;
        }
        .pbx-alt-num--red { color: var(--red); }
        .pbx-alt-name { margin: 0 0 4px; font-size: clamp(17px, 1.6vw, 21px); font-weight: 700; color: var(--ink); }
        .pbx-alt-copy { margin: 0; font-size: 14.5px; line-height: 1.55; color: color-mix(in srgb, var(--ink) 62%, transparent); max-width: 56ch; }
        .pbx-alt-cost {
          font-size: 13px; font-weight: 700;
          color: color-mix(in srgb, var(--ink) 55%, transparent);
          white-space: nowrap;
        }
        .pbx-alt-answer {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: clamp(16px, 3vw, 36px);
          align-items: center;
          background: var(--ink);
          border-radius: 20px;
          padding: clamp(22px, 3vw, 34px);
          box-shadow: 0 30px 70px -34px rgba(20,20,30,0.55);
        }
        .pbx-alt-answer-tag {
          margin: 0 0 8px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-alt-answer-title {
          margin: 0 0 10px;
          font-size: clamp(19px, 2vw, 25px);
          font-weight: 700; line-height: 1.3; letter-spacing: -0.015em;
          color: #fff;
          max-width: 34ch;
        }
        .pbx-alt-answer-cost { margin: 0; font-size: 14.5px; font-weight: 600; color: rgba(255,255,255,0.72); }
        .pbx-alt-cta {
          background: var(--red); color: #fff;
          border-radius: 13px; padding: 14px 22px;
          font-size: 14.5px; font-weight: 700; text-decoration: none;
          white-space: nowrap;
          transition: background 0.25s ease;
          min-height: 44px; display: inline-flex; align-items: center;
        }
        .pbx-alt-cta:hover { background: #c81e2a; }
        .pbx-alt-cta:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        @media (max-width: 720px) {
          .pbx-alt-row { grid-template-columns: auto minmax(0, 1fr); }
          .pbx-alt-cost { grid-column: 2; justify-self: start; }
          .pbx-alt-answer { grid-template-columns: auto minmax(0, 1fr); }
          .pbx-alt-cta { grid-column: 2; justify-self: start; }
        }
      `}</style>
    </section>
  );
}
