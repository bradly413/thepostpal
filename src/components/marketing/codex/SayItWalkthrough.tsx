"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// The four-step done-for-you workflow. Publishing claim verified: approved
// posts enter the internal publish queue and go out to Facebook + Instagram
// on schedule; nothing publishes without approval.
const STEPS = [
  {
    title: "Create in Studio",
    desc: "Make on-brand images and video in Creator Studio — the visuals your calendar needs.",
  },
  {
    title: "Auto caption in your voice",
    desc: "Bulk-generate captions that match how you actually talk, sell, and sound.",
  },
  {
    title: "Schedule as far as you want",
    desc: "Drop posts across the next month — or further. Fill it once instead of chasing the feed.",
  },
  {
    title: "One-click publish",
    desc: "Approve once. Facebook and Instagram go out on schedule from the same post.",
  },
] as const;

/**
 * "Say it. It's made." — calm, unpinned, numbered vertical list.
 * No scrub, no arrows, no scroll hijack. One real product screenshot.
 */
export default function SayItWalkthrough() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-say-row, .pbv-say-shotwrap");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: root,
          start: "top 72%",
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
        root.querySelectorAll(".pbv-say-row"),
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12 },
        "-=0.2",
      );
      tl.fromTo(
        root.querySelector(".pbv-say-shotwrap"),
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 0.7 },
        "-=0.5",
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-say" id="how" aria-labelledby="pbv-say-title" ref={rootRef}>
      <div className="pbv-say-inner">
        <div className="pbv-say-head">
          <p className="pbv-kicker pbv-fade">How Posterboy works</p>
          <h2 id="pbv-say-title" className="pbv-fade">
            Studio. Captions. Calendar. Publish.
          </h2>
        </div>

        <div className="pbv-say-grid">
          <ol className="pbv-say-list">
            {STEPS.map((step, i) => (
              <li className="pbv-say-row" key={step.title}>
                <span className="pbv-say-n" aria-hidden>
                  0{i + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="pbv-say-shotwrap">
            <div className="pbv-say-shot-shell">
              <Image
                src="/marketing/product-demo/auto-caption/02-first-caption.jpg"
                alt="The Posterboy Schedule page: a drafted post with its caption beside the monthly calendar"
                width={1600}
                height={907}
                className="pbv-say-shot"
                sizes="(max-width: 980px) 92vw, 540px"
              />
            </div>
            <p className="pbv-say-shot-note">
              The actual Schedule page — drafts on the left, months of calendar on the right.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .pbv-say {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(56px, 9vh, 120px) clamp(16px, 2.5vw, 36px);
        }
        .pbv-say-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(28px, 4vw, 48px);
          border-radius: clamp(28px, 3vw, 40px);
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(20, 20, 24, 0.06);
          box-shadow:
            0 30px 80px -48px rgba(20, 20, 40, 0.28),
            0 1px 0 rgba(255, 255, 255, 0.7) inset;
        }
        .pbv-kicker {
          margin: 0 0 14px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
        }
        .pbv-say h2 {
          margin: 0 0 42px;
          font-size: clamp(34px, 4.6vw, 56px);
          font-weight: 750;
          letter-spacing: -0.035em;
          line-height: 1.02;
          color: var(--ink);
        }
        .pbv-say-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.52fr) minmax(0, 0.48fr);
          gap: clamp(28px, 4vw, 64px);
          align-items: start;
        }
        .pbv-say-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .pbv-say-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: clamp(14px, 1.8vw, 22px);
          padding: 18px 18px 18px 16px;
          border-radius: 20px;
          background: color-mix(in srgb, #f7f4ee 72%, white);
          border: 1px solid rgba(20, 20, 24, 0.05);
        }
        .pbv-say-n {
          font-size: clamp(22px, 2.2vw, 28px);
          font-weight: 750;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--ink) 22%, transparent);
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .pbv-say-row h3 {
          margin: 0 0 6px;
          font-size: clamp(17px, 1.5vw, 20px);
          font-weight: 750;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .pbv-say-row p {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 58%, transparent);
          max-width: 46ch;
        }
        .pbv-say-shotwrap { position: sticky; top: 100px; }
        .pbv-say-shot-shell {
          background: #fff;
          border: 1px solid rgba(20, 20, 24, 0.06);
          border-radius: 28px;
          padding: 10px;
          box-shadow: 0 24px 56px -36px rgba(20, 20, 40, 0.45);
        }
        .pbv-say-shot {
          display: block;
          width: 100%; height: auto;
          border-radius: 20px;
        }
        .pbv-say-shot-note {
          margin: 14px 8px 0;
          font-size: 12.5px;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
        }
        @media (max-width: 980px) {
          .pbv-say-grid { grid-template-columns: 1fr; }
          .pbv-say-shotwrap { position: static; }
        }
      `}</style>
    </section>
  );
}
