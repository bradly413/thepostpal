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
          Tell Posterboy what is happening at the business. It turns that into the posts, visuals,
          and schedule. You review the week in a few minutes instead of building it from scratch.
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
          padding: clamp(88px, 13vh, 170px) clamp(20px, 3vw, 48px);
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-relief-inner { max-width: 880px; margin: 0 auto; text-align: center; }
        .pbv-relief h2 {
          margin: 0 0 18px;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.06;
          color: var(--ink);
        }
        .pbv-relief-sub {
          margin: 0 auto 44px;
          max-width: 58ch;
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
          font-size: clamp(19px, 2.4vw, 30px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--ink) 82%, transparent);
        }
        .pbv-relief-tag.is-payoff { color: var(--red); }
      `}</style>
    </section>
  );
}
