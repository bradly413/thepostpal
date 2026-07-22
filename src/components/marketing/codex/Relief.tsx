"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// The what-we-handle tags (preserved verbatim) — here they list exactly what
// Posterboy takes off the owner's plate. The payoff stays the section's red.
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

/** Emotional relief: what Posterboy removes from the owner's week. */
export default function Relief() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-relief-tag");
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
        { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 },
      );
      tl.fromTo(
        root.querySelectorAll(".pbv-relief-tag"),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 },
        "-=0.2",
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-relief" aria-labelledby="pbv-relief-title" ref={rootRef}>
      <div className="pbv-relief-inner">
        <h2 id="pbv-relief-title" className="pbv-fade">
          Social media stops being one more thing you forgot.
        </h2>
        <p className="pbv-relief-sub pbv-fade">
          Create in Studio, auto-caption in your voice, and schedule a month out — or further.
          Approve once. Publish to Facebook and Instagram without rebuilding the calendar from scratch.
        </p>
        <p className="pbv-relief-cloud" aria-label="What Posterboy handles">
          {TAGS.map((tag, i) => (
            <span
              key={tag}
              className={`pbv-relief-tag${i === TAGS.length - 1 ? " is-payoff" : ""}`}
            >
              {tag}
            </span>
          ))}
        </p>
      </div>

      <style>{`
        .pbv-relief {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(40px, 7vh, 88px) clamp(16px, 2.5vw, 36px);
        }
        .pbv-relief-inner {
          max-width: 1080px;
          margin: 0 auto;
          text-align: center;
          padding: clamp(36px, 5vw, 64px) clamp(24px, 4vw, 48px);
          border-radius: clamp(28px, 3vw, 40px);
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(20, 20, 24, 0.05);
          box-shadow: 0 24px 64px -44px rgba(20, 20, 40, 0.28);
        }
        .pbv-relief h2 {
          margin: 0 0 18px;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 750;
          letter-spacing: -0.03em;
          line-height: 1.06;
          color: var(--ink);
        }
        .pbv-relief-sub {
          margin: 0 auto 40px;
          max-width: 54ch;
          font-size: clamp(15.5px, 1.2vw, 18px);
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 60%, transparent);
        }
        .pbv-relief-cloud {
          margin: 0;
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 8px 16px;
        }
        .pbv-relief-tag {
          font-size: clamp(18px, 2.2vw, 28px);
          font-weight: 750;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--ink) 82%, transparent);
        }
        .pbv-relief-tag.is-payoff { color: var(--red); }
      `}</style>
    </section>
  );
}
