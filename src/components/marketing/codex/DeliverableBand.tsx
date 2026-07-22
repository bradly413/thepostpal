"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

const FACTS = [
  {
    n: "01",
    title: "Creator Studio",
    body: "Make the visuals in Studio — on-brand images and video ready for the calendar.",
  },
  {
    n: "02",
    title: "Auto captions in your voice",
    body: "Bulk-write captions that sound like you, not a generic content calendar.",
  },
  {
    n: "03",
    title: "Schedule as far as you want",
    body: "Queue a month out — or further. Fill the calendar once and stop babysitting it.",
  },
  {
    n: "04",
    title: "One-click publish",
    body: "Facebook and Instagram from the same post. Approve once, publish everywhere.",
  },
] as const;

/** Four product pillars — month-out scheduling, not a weekly chore. */
export default function DeliverableBand() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-del-row");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        bits,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-del" aria-labelledby="pbv-del-title" ref={rootRef}>
      <div className="pbv-del-inner">
        <h2 id="pbv-del-title" className="pbv-fade">
          Studio. Captions. Calendar. Publish.
        </h2>
        <ol className="pbv-del-list">
          {FACTS.map((fact) => (
            <li className="pbv-del-row" key={fact.n}>
              <span className="pbv-del-n" aria-hidden>
                {fact.n}
              </span>
              <div>
                <h3>{fact.title}</h3>
                <p>{fact.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        .pbv-del {
          --ink: #141418;
          --red: #ee2532;
          padding: clamp(28px, 5vh, 56px) clamp(16px, 2.5vw, 36px) clamp(40px, 7vh, 72px);
        }
        .pbv-del-inner {
          max-width: 1180px;
          margin: 0 auto;
        }
        .pbv-del h2 {
          margin: 0 0 clamp(28px, 4vw, 40px);
          font-size: clamp(28px, 3.6vw, 42px);
          font-weight: 750;
          letter-spacing: -0.035em;
          line-height: 1.08;
          color: var(--ink);
          max-width: 18ch;
        }
        .pbv-del-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(20, 20, 24, 0.1);
        }
        .pbv-del-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          padding: 22px 16px 22px 0;
          border-bottom: 1px solid rgba(20, 20, 24, 0.1);
        }
        .pbv-del-row + .pbv-del-row {
          padding-left: 16px;
          border-left: 1px solid rgba(20, 20, 24, 0.1);
        }
        .pbv-del-n {
          font-size: 12px;
          font-weight: 750;
          letter-spacing: 0.08em;
          color: var(--red);
          padding-top: 4px;
        }
        .pbv-del-row h3 {
          margin: 0 0 6px;
          font-size: clamp(15px, 1.2vw, 18px);
          font-weight: 750;
          letter-spacing: -0.02em;
        }
        .pbv-del-row p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: color-mix(in srgb, var(--ink) 58%, transparent);
          max-width: 28ch;
        }
        @media (max-width: 980px) {
          .pbv-del-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pbv-del-row:nth-child(odd) {
            padding-left: 0;
            border-left: 0;
          }
          .pbv-del-row:nth-child(even) {
            padding-left: 16px;
            border-left: 1px solid rgba(20, 20, 24, 0.1);
          }
        }
        @media (max-width: 560px) {
          .pbv-del-list { grid-template-columns: 1fr; }
          .pbv-del-row,
          .pbv-del-row + .pbv-del-row,
          .pbv-del-row:nth-child(even) {
            padding-left: 0;
            border-left: 0;
          }
        }
      `}</style>
    </section>
  );
}
