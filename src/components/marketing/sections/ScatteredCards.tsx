"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import ScatteredDashboardHolder from "@/components/marketing/sections/ScatteredDashboardHolder";
import ScatteredVideoHolder from "@/components/marketing/sections/ScatteredVideoHolder";

gsap.registerPlugin(ScrollTrigger);

/**
 * Three-phase scroll choreography:
 *
 * Phase A — PRE-REVEAL (section overlaps hero's empty lower band).
 *   Section starts behind the hero with negative margin-top, so first-row
 *   cards live in the empty area below the hero CTAs from page-load.
 *   As the user scrolls, cards stagger-fade in via fadeStart values.
 *
 * Phase B — REVEAL COMPLETE / PIN ENGAGED.
 *   When the section's top reaches the viewport top, the second ScrollTrigger
 *   engages a pin on the stage. All cards are fully revealed by this moment.
 *
 * Phase C — CONVERGENCE.
 *   During the pin, the focal card scales up to fill the viewport while every
 *   other card shrinks and is pulled toward the focal point, fading out.
 */
type Card = {
  src: string;
  alt: string;
  x: number;
  y: number;
  w: number;
  rotate: number;
  speed: number;
  fadeStart: number;
  /** Base opacity multiplier (0–1). Some cards render translucent to suggest
   *  depth layering, like glass overlays. Defaults to 1 if omitted. */
  baseOpacity?: number;
  focal?: boolean;
  /** Focal product preview — 16:9 portal dashboard */
  dashboard?: boolean;
  /** Vertical reel slot — Remotion Player (9:16) */
  video?: boolean;
  /** Reel content: listing photo Ken Burns */
  videoVariant?: "listing";
};

const FADE_WINDOW = 0.10;
const PARALLAX_X = 220;
const PARALLAX_Y = 460;
const DEPTH_RANGE = 1400;
const NEAR_BOOST = 0.32;
const FOG_FLOOR = 0.18;
const DEPTH_BLUR_MAX = 2.4;
const APPROACH_DISTANCE = 380; // px the whole field travels forward during scroll
const APPROACH_SCALE = 0.85;   // extra scale-up applied at end of scroll
/** Focal dashboard fills viewport during pin convergence */
const FOCAL_DASHBOARD_FILL = 2.4;
const SECTION_OVERLAP_VH = 0;

// 32 cards, dense overlap, varied sizes.
const CARDS: Card[] = [
  // Top band — y 4–14% (visible below hero CTAs at scroll=0)
  { src: "/mockup-library/listing/1.jpg",     alt: "Listing",    x: 4,  y: 6,  w: 130, rotate: 0, speed: 0.85, fadeStart: 0.000 },
  { src: "/previews/new-listing.png",         alt: "Just Listed",x: 18, y: 10, w: 200, rotate: 0,  speed: 0.55, fadeStart: 0.013 },
  { src: "/mockup-library/sold/1.jpg",        alt: "Sold",       x: 32, y: 4,  w: 110, rotate: 0, speed: 0.95, fadeStart: 0.025 },
  { src: "/mockup-library/listing/3.jpg",     alt: "Listing",    x: 47, y: 9,  w: 240, rotate: 0,  speed: 0.35, fadeStart: 0.038 },
  { src: "/mockup-library/lifestyle/1.jpg",   alt: "Lifestyle",  x: 62, y: 5,  w: 150, rotate: 0, speed: 0.70, fadeStart: 0.050 },
  { src: "/mockup-library/listing/5.jpg",     alt: "Listing",    x: 78, y: 12, w: 180, rotate: 0,  speed: 0.50, fadeStart: 0.063 },
  { src: "/mockup-library/sold/2.jpg",        alt: "Sold",       x: 93, y: 7,  w: 120, rotate: 0, speed: 0.90, fadeStart: 0.075 },

  // Upper-mid — y 22–32%
  { src: "/previews/market-clarity.png",      alt: "Market",     x: 9,  y: 26, w: 170, rotate: 0,  speed: 0.45, fadeStart: 0.110 },
  { src: "/mockup-library/listing/7.jpg",     alt: "Listing",    x: 24, y: 30, w: 110, rotate: 0, speed: 0.90, fadeStart: 0.125 },
  { src: "/mockup-library/lifestyle/2.jpg",   alt: "Lifestyle",  x: 38, y: 24, w: 220, rotate: 0,  speed: 0.40, fadeStart: 0.140 },
  { src: "/mockup-library/sold/3.jpg",        alt: "Sold",       x: 56, y: 28, w: 140, rotate: 0, speed: 0.75, fadeStart: 0.155 },
  { src: "/previews/quote-personal.png",      alt: "Quote",      x: 71, y: 22, w: 190, rotate: 0,  speed: 0.55, fadeStart: 0.170 },
  { src: "/mockup-library/listing/9.jpg",     alt: "Listing",    x: 88, y: 28, w: 130, rotate: 0,  speed: 0.85, fadeStart: 0.185 },

  // Mid — y 44–52% (focal sits here)
  { src: "/mockup-library/lifestyle/3.jpg",   alt: "Lifestyle",  x: 6,  y: 48, w: 200, rotate: 0, speed: 0.50, fadeStart: 0.220 },
  { src: "/previews/photo-overlay.png",       alt: "Photo",      x: 22, y: 44, w: 130, rotate: 0,  speed: 0.95, fadeStart: 0.235 },
  { src: "/mockup-library/listing/12.jpg",    alt: "Listing",    x: 38, y: 50, w: 170, rotate: 0, speed: 0.65, fadeStart: 0.250 },
  {
    src: "/mockup-library/listing/15.jpg",
    alt: "Posterboy dashboard preview",
    x: 50,
    y: 48,
    w: 520,
    rotate: 0,
    speed: 1.0,
    fadeStart: 0.265,
    focal: true,
    dashboard: true,
  },
  { src: "/mockup-library/sold/4.jpg",        alt: "Sold",       x: 65, y: 44, w: 140, rotate: 0,  speed: 0.80, fadeStart: 0.280 },
  { src: "/mockup-library/listing/14.jpg",    alt: "Listing",    x: 80, y: 50, w: 190, rotate: 0, speed: 0.45, fadeStart: 0.295 },
  { src: "/mockup-library/lifestyle/4.jpg",   alt: "Lifestyle",  x: 95, y: 46, w: 110, rotate: 0,  speed: 0.90, fadeStart: 0.310 },

  // Lower-mid — y 64–72%
  { src: "/previews/tips-checklist.png",      alt: "Tips",       x: 8,  y: 68, w: 160, rotate: 0,  speed: 0.70, fadeStart: 0.330 },
  { src: "/mockup-library/listing/17.jpg",    alt: "Listing",    x: 23, y: 64, w: 220, rotate: 0, speed: 0.40, fadeStart: 0.345 },
  { src: "/mockup-library/sold/5.jpg",        alt: "Sold",       x: 40, y: 70, w: 110, rotate: 0,  speed: 0.95, fadeStart: 0.360 },
  { src: "/mockup-library/lifestyle/5.jpg",   alt: "Lifestyle",  x: 56, y: 66, w: 200, rotate: 0, speed: 0.55, fadeStart: 0.375 },
  { src: "/mockup-library/sold/7.jpg",        alt: "Sold",       x: 73, y: 72, w: 140, rotate: 0,  speed: 0.80, fadeStart: 0.390 },
  { src: "/mockup-library/listing/20.jpg",    alt: "Listing",    x: 90, y: 66, w: 170, rotate: 0, speed: 0.60, fadeStart: 0.405 },

  // Bottom band — y 84–94% (last to reveal)
  { src: "/previews/event-spotlight.png",     alt: "Event",      x: 5,  y: 88, w: 160, rotate: 0, speed: 0.65, fadeStart: 0.430 },
  { src: "/mockup-library/listing/22.jpg",    alt: "Listing",    x: 22, y: 92, w: 120, rotate: 0,  speed: 0.90, fadeStart: 0.445 },
  { src: "/mockup-library/sold/8.jpg",        alt: "Sold",       x: 38, y: 86, w: 200, rotate: 0, speed: 0.50, fadeStart: 0.460 },
  { src: "/mockup-library/lifestyle/6.jpg",   alt: "Lifestyle",  x: 56, y: 92, w: 130, rotate: 0,  speed: 0.85, fadeStart: 0.475 },
  { src: "/mockup-library/listing/24.jpg",    alt: "Listing",    x: 73, y: 86, w: 190, rotate: 0, speed: 0.55, fadeStart: 0.490 },
  { src: "/mockup-library/listing/25.jpg",    alt: "Listing",    x: 91, y: 92, w: 130, rotate: 0,  speed: 0.90, fadeStart: 0.500 },
];

export default function ScatteredCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;

      const tiles = cardsRef.current.filter(Boolean);

      if (reducedMotion) {
        gsap.set(tiles, { opacity: 1, x: 0, y: 0, scale: 1 });
        return;
      }

      // Shared state both ScrollTriggers write into.
      const state = { reveal: 0, converge: 0 };

      const paint = () => {
        const r = state.reveal;
        const c = state.converge; // doubles as "approach" progress

        tiles.forEach((tile, i) => {
          const cfg = CARDS[i];

          // Reveal envelope
          const localProgress = gsap.utils.clamp(
            0,
            1,
            (r - cfg.fadeStart) / FADE_WINDOW,
          );

          // Parallax drift, attenuated as approach ramps
          const parallaxScale = 1 - c * 0.3;
          const parallaxX = (1 - cfg.speed) * PARALLAX_X * r * parallaxScale * (i % 2 === 0 ? 1 : -1);
          const parallaxY = (1 - cfg.speed) * PARALLAX_Y * r * parallaxScale;
          const liftIn = 16 * (1 - localProgress);

          // 3D depth: speed → base translateZ.
          const baseZ = (cfg.speed - 1) * DEPTH_RANGE;
          // Approach: as scroll progresses, the whole field travels FORWARD
          // toward the camera.  Every card's Z increases — cards get closer.
          const approachZ = APPROACH_DISTANCE * c;
          const z = baseZ + approachZ;

          // Near boost — fast cards visibly bigger from the start.
          const nearScale = 1 + cfg.speed * NEAR_BOOST;
          // Approach scale: every card grows as the field comes closer
          // (perspective compounds this, so a modest multiplier reads strong).
          const approachScale = 1 + APPROACH_SCALE * c;
          const focalFill =
            cfg.focal && cfg.dashboard ? 1 + c * FOCAL_DASHBOARD_FILL : 1;
          const scale = nearScale * approachScale * focalFill;

          // Atmospheric fog dims deep cards; clears as they approach (deep
          // cards effectively become "near" cards as they translate forward).
          const depthT = (cfg.speed - 0.2) / 0.8;
          const effectiveDepthT = gsap.utils.clamp(0, 1, depthT + c * 0.6);
          const depthDim = FOG_FLOOR + (1 - FOG_FLOOR) * effectiveDepthT;
          const baseOp = cfg.baseOpacity ?? 1;
          const opacity = localProgress * depthDim * baseOp;

          // Blur shrinks as cards approach the camera (they sharpen).
          const blur = DEPTH_BLUR_MAX * (1 - effectiveDepthT);

          gsap.set(tile, {
            opacity,
            x: parallaxX,
            y: parallaxY + liftIn,
            z,
            scale,
            rotation: cfg.rotate,
            rotationY: 0,
            filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : "none",
            force3D: true,
          });
        });
      };

      // PHASE A — Pre-pin reveal. Starts only after section's top has crossed
      // 70% down the viewport, so at page load nothing is visible.  Cards fade
      // in as the user scrolls and the section rises into view.
      const revealST = ScrollTrigger.create({
        trigger: section,
        start: "top 70%",
        end: "top top",
        scrub: 1,
        onUpdate: (self) => {
          state.reveal = self.progress * 0.6; // map ST progress 0→1 to reveal phase 0→0.6
          paint();
        },
      });

      // PHASE B+C — Pin + convergence. Engages when section top hits viewport
      // top. Continues for one viewport height of scroll runway, during which
      // the focal card scales to fill.
      const pinST = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=120%",
        pin: stage,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
          // Reveal completes at the start of pin, then convergence drives.
          state.reveal = 0.6 + self.progress * 0.4; // 0.6 → 1.0
          state.converge = self.progress;
          paint();
        },
      });

      // Sync initial state to whatever scroll position the page already has
      // (negative-margin overlap means revealST.progress is non-zero at scroll=0).
      const syncFromTriggers = () => {
        const rProg = revealST.progress;
        const pProg = pinST.progress;
        state.reveal = rProg * 0.6 + pProg * 0.4;
        state.converge = pProg;
        paint();
      };
      syncFromTriggers();
      // Refresh once more on next frame after layout settles.
      requestAnimationFrame(syncFromTriggers);

      return () => {
        revealST.kill();
        pinST.kill();
      };
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section
      ref={sectionRef}
      id="scattered"
      aria-label="Posterboy in the wild"
      style={{
        position: "relative",
        width: "100%",
        marginTop: `-${SECTION_OVERLAP_VH}vh`,
        zIndex: 0,
      }}
    >
      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100dvh",
          background: "var(--paper)",
          overflow: "hidden",
          perspective: "550px",
          perspectiveOrigin: "50% 50%",
          transformStyle: "preserve-3d",
        }}
      >
        {CARDS.map((card, i) => {
          // Flat, no shadows — matches the Framer reference. Depth comes from
          // size and atmospheric dimming only.
          const boxShadow = "none";
          return (
          <div
            key={i}
            ref={(el) => {
              if (el) cardsRef.current[i] = el;
            }}
            style={{
              position: "absolute",
              left: `${card.x}%`,
              top: `${card.y}%`,
              width: `clamp(80px, ${card.w / 14}vw, ${card.w}px)`,
              transform: `translate(-50%, -50%) rotate(${card.rotate}deg)`,
              transformOrigin: "center center",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              borderRadius: 0,
              overflow: "hidden",
              boxShadow,
              willChange: "transform, opacity",
              zIndex: card.focal ? 50 : 10 + (i % 5),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {card.dashboard ? (
              <ScatteredDashboardHolder alt={card.alt} />
            ) : card.video && !reducedMotion ? (
              <ScatteredVideoHolder alt={card.alt} posterSrc={card.src} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={card.src}
                alt={card.alt}
                draggable={false}
                loading="lazy"
                style={{
                  width: "100%",
                  height: card.video || card.dashboard ? "100%" : "auto",
                  display: "block",
                  objectFit: "cover",
                  userSelect: "none",
                  pointerEvents: "none",
                  aspectRatio: card.video ? "9 / 16" : card.dashboard ? "16 / 9" : undefined,
                }}
              />
            )}
          </div>
          );
        })}
      </div>
    </section>
  );
}
