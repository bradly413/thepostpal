import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);

// One editorial ease for the whole marketing site — quick to leave, settles
// softly (an expo-out feel). Registered once as "pb-ease".
CustomEase.create("pb-ease", "0.16, 1, 0.3, 1");

// Shared motion tokens. Every section animates from the same vocabulary so the
// page feels authored, not assembled.
export const PB_MOTION = {
  ease: "pb-ease",
  dur: 0.85,
  durSlow: 1.1,
  stagger: 0.08,
  y: 32,
  ySm: 18,
  yLg: 56,
} as const;

const DISTANCE: Record<string, number> = {
  up: PB_MOTION.y,
  "up-sm": PB_MOTION.ySm,
  "up-lg": PB_MOTION.yLg,
};

/**
 * Site-wide scroll reveal. Any element with a `data-reveal` attribute fades and
 * rises into view; neighbours that enter together are batched with a stagger.
 *
 *   <div data-reveal>…</div>          // default rise (32px)
 *   <div data-reveal="up-sm">…</div>  // smaller rise (18px)
 *   <div data-reveal="up-lg">…</div>  // larger rise (56px)
 *
 * Call once after the page (and Lenis) are ready; returns a cleanup that kills
 * the ScrollTriggers it created. Reduced motion → elements are simply shown.
 */
export function setupRevealBatch(reducedMotion: boolean): () => void {
  const els = gsap.utils.toArray<HTMLElement>("[data-reveal]");
  if (els.length === 0) return () => {};

  if (reducedMotion) {
    gsap.set(els, { autoAlpha: 1, y: 0 });
    return () => {};
  }

  els.forEach((el) => {
    const kind = el.getAttribute("data-reveal") || "up";
    gsap.set(el, { autoAlpha: 0, y: DISTANCE[kind] ?? PB_MOTION.y });
  });

  const triggers = ScrollTrigger.batch("[data-reveal]", {
    start: "top 86%",
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: PB_MOTION.dur,
        ease: PB_MOTION.ease,
        stagger: PB_MOTION.stagger,
        overwrite: true,
      }),
    onLeaveBack: (batch) =>
      gsap.to(batch, {
        autoAlpha: 0,
        y: PB_MOTION.ySm,
        duration: 0.4,
        ease: "power2.in",
        overwrite: true,
      }),
  });

  return () => triggers.forEach((t) => t.kill());
}
