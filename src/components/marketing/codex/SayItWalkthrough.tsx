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
    title: "Set the voice once.",
    desc: "Give Posterboy the basics: what you do, how you sound, what you sell, and what you never want to sound like.",
  },
  {
    title: "Posterboy builds the week.",
    desc: "Specials, openings, appointments, events, listings, a quiet week — Posterboy turns what is happening into useful posts with captions and visuals.",
  },
  {
    title: "Review it. Change it. Approve it.",
    desc: "You stay in control without starting from a blank screen. Edit a caption, swap an image, or just approve.",
  },
  {
    title: "Approved posts move to the calendar.",
    desc: "Posterboy schedules the work for Facebook and Instagram so the feed does not disappear when the business gets busy.",
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
            Say it. It&rsquo;s made.
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
            <p className="pbv-say-shot-note">The actual Schedule page — drafts on the left, the week on the right.</p>
          </div>
        </div>
      </div>

      <style>{`
        .pbv-say {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(88px, 13vh, 170px) clamp(20px, 3vw, 48px);
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-say-inner { max-width: 1080px; margin: 0 auto; }
        .pbv-kicker {
          margin: 0 0 14px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
        }
        .pbv-say h2 {
          margin: 0 0 54px;
          font-size: clamp(34px, 4.6vw, 56px);
          font-weight: 700;
          letter-spacing: -0.035em;
          line-height: 1.02;
          color: var(--ink);
        }
        .pbv-say-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.52fr) minmax(0, 0.48fr);
          gap: clamp(32px, 5vw, 80px);
          align-items: start;
        }
        .pbv-say-list { list-style: none; margin: 0; padding: 0; }
        .pbv-say-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: clamp(16px, 2vw, 28px);
          padding: 26px 0;
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-say-row:last-child { border-bottom: 1px solid rgba(20, 20, 24, 0.08); }
        .pbv-say-n {
          font-size: clamp(26px, 2.6vw, 34px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--ink) 18%, transparent);
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .pbv-say-row h3 {
          margin: 0 0 7px;
          font-size: clamp(19px, 1.8vw, 24px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .pbv-say-row p {
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 60%, transparent);
          max-width: 46ch;
        }
        .pbv-say-shotwrap { position: sticky; top: 100px; }
        .pbv-say-shot-shell {
          background: rgba(20, 20, 24, 0.04);
          border: 1px solid rgba(20, 20, 24, 0.07);
          border-radius: 22px;
          padding: 7px;
        }
        .pbv-say-shot {
          display: block;
          width: 100%; height: auto;
          border-radius: 16px;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.4);
        }
        .pbv-say-shot-note {
          margin: 12px 4px 0;
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
