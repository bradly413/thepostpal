"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

const WORDS = [
  "Somewhere",
  "between",
  "the",
  "stress",
  "of",
  "content",
  "calendars",
  "and",
  "the",
  "pressure",
  "to",
  "post,",
  "we",
  "built",
  "something",
  "simpler.",
  "Real",
  "posts.",
  "Real",
  "strategy.",
  "One",
  "tap",
  "to",
  "approve.",
  "Social",
  "made",
  "tolerable.",
];

const DIM = "#d4cfc6";
const INK = "#080808";

export default function ScrollWordReveal() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const section = sectionRef.current;
      if (!section) return;

      const spans = section.querySelectorAll<HTMLElement>(".reveal-word");
      if (spans.length === 0) return;

      if (reducedMotion) {
        gsap.set(spans, { color: INK });
        return;
      }

      gsap.set(spans, { color: DIM });

      const paintWords = (progress: number) => {
        const n = spans.length;
        spans.forEach((span, i) => {
          const start = i / n;
          const end = (i + 1) / n;
          const t = gsap.utils.clamp(0, 1, (progress - start) / (end - start || 1));
          span.style.color = gsap.utils.interpolate(DIM, INK, t);
        });
      };

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => paintWords(self.progress),
        onLeaveBack: () => paintWords(0),
        onEnterBack: () => paintWords(0),
      });
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <div ref={sectionRef} id="manifesto" className="manifesto-section">
      <div className="rule" style={{ margin: "0 var(--px)" }} />

      <div className="manifesto-sticky">
        <span className="section-num">Our manifesto</span>

        <p className="manifesto-text">
          {WORDS.map((word, i) => (
            <span key={i} className="reveal-word">
              {word}
              {"\u00A0"}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
