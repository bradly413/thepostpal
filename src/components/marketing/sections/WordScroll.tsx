"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

const WORDS = [
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
];

export default function WordScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const section = sectionRef.current;
      const list = listRef.current;
      if (!section || !list) return;

      const items = [...list.querySelectorAll<HTMLElement>(".word-item")];
      if (items.length === 0) return;

      // The final word ("your peace of mind.") is the payoff — it glows in
      // Posterboy red when it lights up, instead of ink.
      const RED = "#ee2532";
      const lastIdx = items.length - 1;

      if (reducedMotion) {
        gsap.set(items, { opacity: 1, color: "var(--ink)" });
        gsap.set(items[lastIdx], { color: RED });
        return;
      }

      gsap.set(items, { opacity: 0.25, color: "var(--newsprint)" });

      const paintWords = (progress: number) => {
        const idx = Math.min(Math.floor(progress * items.length), items.length - 1);
        items.forEach((item, i) => {
          const on = i === idx;
          gsap.set(item, {
            opacity: on ? 1 : 0.25,
            color: on ? (i === lastIdx ? RED : "var(--ink)") : "var(--newsprint)",
          });
        });
      };

      ScrollTrigger.create({
        trigger: list,
        start: "top 60%",
        end: "bottom 40%",
        scrub: 1,
        onUpdate: (self) => paintWords(self.progress),
        onLeaveBack: () => paintWords(0),
        onEnterBack: () => paintWords(0),
      });

      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 88%",
              toggleActions: "play reverse play reverse",
            },
          },
        );
      }
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <div
      ref={sectionRef}
      id="wordscroll"
      style={{
        background: "var(--paper)",
        position: "relative",
        padding: "clamp(80px, 12vh, 160px) var(--px)",
      }}
    >
      <div className="rule" style={{ margin: "0 auto", maxWidth: "calc(100% - var(--px) * 2)" }} />

      <div
        ref={headingRef}
        style={{ textAlign: "center", marginBottom: "clamp(40px, 6vh, 80px)" }}
      >
        <span className="section-num">What we handle</span>
      </div>

      <div ref={listRef} style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        {WORDS.map((word, i) => (
          <div key={i} className="word-item">
            {word}
          </div>
        ))}
      </div>
    </div>
  );
}
