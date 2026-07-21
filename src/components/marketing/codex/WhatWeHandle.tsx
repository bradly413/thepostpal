"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// Tag list carried over verbatim (source of truth — do not replace with
// generic feature labels). The final tag is the payoff and stays red.
const TAGS = [
  "your posts.",
  "your schedule.",
  "your approvals.",
  "your captions.",
  "your hashtags.",
  "your reporting.",
  "your strategy.",
  "your consistency.",
  "your brand voice.",
  "your peace of mind.",
] as const;

/** Staggered tag reveal — one section timeline, no scrub. */
export default function WhatWeHandle() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const head = root.querySelector<HTMLElement>(".pbx-wwh-head");
      const tags = root.querySelectorAll<HTMLElement>(".pbx-wwh-tag");

      if (reducedMotion) {
        gsap.set([head, ...Array.from(tags)].filter(Boolean), { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: root,
          start: "top 76%",
          end: "bottom 10%",
          toggleActions: "play none none reverse",
        },
      });
      if (head) tl.fromTo(head, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5 });
      tl.fromTo(
        tags,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 },
        "-=0.2",
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbx-wwh" aria-labelledby="pbx-wwh-title" ref={rootRef}>
      <div className="pbx-wwh-head">
        <p className="pbx-wwh-kicker">What we handle</p>
        <h2 id="pbx-wwh-title" className="sr-only">
          What Posterboy handles for you
        </h2>
      </div>
      <p className="pbx-wwh-cloud">
        {TAGS.map((tag, i) => (
          <span
            key={tag}
            className={`pbx-wwh-tag${i === TAGS.length - 1 ? " pbx-wwh-tag--payoff" : ""}`}
          >
            {tag}
          </span>
        ))}
      </p>

      <style>{`
        .pbx-wwh {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(64px, 10vh, 130px) clamp(20px, 3vw, 48px);
          max-width: 880px;
          margin: 0 auto;
          text-align: center;
        }
        .pbx-wwh-kicker {
          margin: 0 0 26px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-wwh-cloud {
          margin: 0;
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 10px 14px;
        }
        .pbx-wwh-tag {
          font-size: clamp(19px, 2.6vw, 30px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .pbx-wwh-tag--payoff { color: var(--red); }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
      `}</style>
    </section>
  );
}
