"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import PosterboyLogo from "@/components/PosterboyLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Inkwell-inspired cinematic hero, one pinned master timeline:
//   Phase 1 — 20 real post-images orbit the serif posterboy wordmark; the ring
//             scrub-rotates a full turn.
//   Transition — the ring scales up + fades (you "pass through" it), center fades.
//   Phase 2 (VISION) — a card centers; "AI is changing the way you post about […]"
//             cross-fades through topics while side cards drift to the edges.
//
// Gemini's 3D-diamond Phase 3 was intentionally dropped — off-brand vs. the
// screenshots, which are the word-cycle beat above. 2D CSS transforms (no WebGL).

const IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/hero-ring/${String(i + 1).padStart(2, "0")}.jpg`,
);

const SECTIONS = ["INTRO", "VISION", "INTELLIGENCE", "APPLICATIONS"];

// VISION beat: each topic pairs a centered card image with the cycling word.
const VISION = [
  { img: "/hero-ring/03.jpg", word: "your listings" },
  { img: "/hero-ring/02.jpg", word: "the weekend special" },
  { img: "/hero-ring/09.jpg", word: "the open house" },
  { img: "/hero-ring/15.jpg", word: "your community" },
];

export default function RingHero() {
  const root = useRef<HTMLElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const wheel = wheelRef.current;
      const section = root.current;
      if (!wheel || !section) return;

      const cards = gsap.utils.toArray<HTMLElement>(".rh-card");
      const N = cards.length;

      const place = () => {
        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.38;
        cards.forEach((card, i) => {
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
          gsap.set(card, {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
            xPercent: -50,
            yPercent: -50,
            rotation: (angle * 180) / Math.PI + 90,
          });
        });
      };
      place();

      // Reduced motion: static ring + center, no sequence.
      if (reducedMotion) {
        gsap.set(wheel, { rotation: 0 });
        gsap.set(".rh-vision", { autoAlpha: 0 });
        gsap.from(".rh-center > *", { autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.6 });
        return;
      }

      gsap.set(".rh-vision", { autoAlpha: 0 });
      gsap.set(".rh-vis-card, .rh-vis-word", { autoAlpha: 0 });
      gsap.from(".rh-card", {
        autoAlpha: 0,
        scale: 0.86,
        stagger: { each: 0.02, from: "random" },
        duration: 0.7,
        ease: "power2.out",
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=5200",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // ── Phase 1: ring spins a full turn
      tl.to(wheel, { rotation: 360, ease: "none", duration: 5 });

      // ── Transition: pass through the ring; center fades
      tl.to(wheel, { scale: 4.4, autoAlpha: 0, ease: "power2.in", duration: 1.6 })
        .to(".rh-center", { autoAlpha: 0, scale: 1.3, ease: "power2.in", duration: 1.6 }, "<");

      // ── Phase 2: VISION
      tl.to(".rh-vision", { autoAlpha: 1, duration: 0.4 });
      tl.addLabel("vision");

      // Side cards drift from near-center out to the edges over the whole beat.
      tl.fromTo(
        ".rh-vis-side",
        { x: (i) => (i % 2 === 0 ? -90 : 90), y: 40, autoAlpha: 0 },
        {
          x: (i) => (i % 2 === 0 ? -480 : 480),
          y: (i) => (i % 2 === 0 ? -60 : 80),
          autoAlpha: 0.55,
          ease: "none",
          duration: 6,
        },
        "vision",
      );

      // Centered card + word cross-fade through the topics.
      VISION.forEach((_, i) => {
        const cur = [`.rh-vis-card-${i}`, `.rh-vis-word-${i}`];
        if (i === 0) {
          tl.to(cur, { autoAlpha: 1, duration: 0.5 }, "vision");
        } else {
          tl.to([`.rh-vis-card-${i - 1}`, `.rh-vis-word-${i - 1}`], { autoAlpha: 0, duration: 0.5 })
            .to(cur, { autoAlpha: 1, duration: 0.5 }, "<0.25");
        }
        tl.to({}, { duration: 1 }); // hold on this topic
      });

      const onResize = () => {
        place();
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    },
    { dependencies: [ready, reducedMotion], scope: root },
  );

  return (
    <section ref={root} className="rh" aria-label="Posterboy — the future is built on AI">
      <nav className="rh-rail" aria-label="Sections">
        {SECTIONS.map((s, i) => (
          <span key={s} className={`rh-rail-item${i === 0 ? " is-active" : ""}`}>
            {s}
          </span>
        ))}
      </nav>

      <div className="rh-stage">
        {/* Phase 1 — ring + center */}
        <div className="rh-center">
          <PosterboyLogo href={null} className="rh-logo" />
          <p className="rh-tagline">The future is built on Artificial Intelligence.</p>
          <p className="rh-scroll">SCROLL&nbsp;&nbsp;TO&nbsp;&nbsp;EXPLORE</p>
        </div>

        <div ref={wheelRef} className="rh-wheel" aria-hidden>
          {IMAGES.map((src, i) => (
            <div key={i} className="rh-card" style={{ backgroundImage: `url(${src})` }} />
          ))}
        </div>

        {/* Phase 2 — VISION beat */}
        <div className="rh-vision" aria-hidden>
          {VISION.map((v, i) => (
            <div
              key={i}
              className={`rh-vis-card rh-vis-card-${i}`}
              style={{ backgroundImage: `url(${v.img})` }}
            />
          ))}
          {/* drifting side cards (reuse a couple ring images) */}
          <div className="rh-vis-side" style={{ backgroundImage: "url(/hero-ring/06.jpg)" }} />
          <div className="rh-vis-side" style={{ backgroundImage: "url(/hero-ring/12.jpg)" }} />

          <div className="rh-vis-copy">
            <p className="rh-vis-lead">AI is changing the way you post about</p>
            <span className="rh-vis-words">
              {VISION.map((v, i) => (
                <span key={i} className={`rh-vis-word rh-vis-word-${i}`}>
                  {v.word}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .rh { position: relative; background: #F6F8FA; color: #1E272D; }
        .rh-rail {
          position: absolute; top: 0; left: 0; right: 0; z-index: 20;
          display: flex; gap: 34px; justify-content: center; padding: 28px 0;
          font-family: ui-monospace, "Roboto Mono", "SFMono-Regular", Menlo, monospace;
          font-size: 11px; letter-spacing: 0.18em;
        }
        .rh-rail-item { color: rgba(30,39,45,0.32); transition: color 0.3s ease; }
        .rh-rail-item.is-active { color: #1E272D; }

        .rh-stage {
          position: relative; height: 100vh;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .rh-center {
          position: relative; z-index: 10; text-align: center; pointer-events: none;
          transform: translateY(36px);
        }
        .rh-center .rh-logo { font-size: clamp(40px, 6vw, 76px); color: #1E272D; line-height: 1; }
        .rh-tagline { margin: 22px 0 0; font-size: clamp(14px, 1.4vw, 17px); font-weight: 300; color: rgba(30,39,45,0.78); }
        .rh-scroll {
          margin: 14px 0 0;
          font-family: ui-monospace, "Roboto Mono", "SFMono-Regular", Menlo, monospace;
          font-size: 11px; letter-spacing: 0.22em; color: rgba(30,39,45,0.5);
        }

        .rh-wheel {
          position: absolute; top: calc(50% + 36px); left: 50%;
          width: 0; height: 0; transform-origin: center center; will-change: transform;
        }
        .rh-card {
          position: absolute; top: 0; left: 0;
          width: clamp(40px, 4.4vw, 66px); aspect-ratio: 4 / 5;
          border-radius: 0; background-size: cover; background-position: center;
          box-shadow: 0 14px 34px -12px rgba(20,25,40,0.28);
          transform-origin: center center;
        }

        /* ── VISION beat ── */
        .rh-vision { position: absolute; inset: 0; z-index: 12; pointer-events: none; }
        .rh-vis-card {
          position: absolute; top: 50%; left: 50%;
          width: clamp(150px, 16vw, 230px); aspect-ratio: 4 / 5;
          transform: translate(-50%, -50%) translateY(-40px);
          background-size: cover; background-position: center;
          border-radius: 14px; box-shadow: 0 30px 70px -24px rgba(20,25,40,0.4);
        }
        .rh-vis-side {
          position: absolute; top: 50%; left: 50%;
          width: clamp(120px, 12vw, 180px); aspect-ratio: 4 / 5;
          transform: translate(-50%, -50%);
          background-size: cover; background-position: center;
          border-radius: 12px; box-shadow: 0 24px 60px -22px rgba(20,25,40,0.3);
        }
        .rh-vis-copy {
          position: absolute; left: 0; right: 0; bottom: 16%;
          text-align: center;
        }
        .rh-vis-lead { margin: 0; font-size: clamp(15px, 1.5vw, 19px); font-weight: 300; color: rgba(30,39,45,0.55); }
        .rh-vis-words { position: relative; display: inline-block; margin-top: 8px; min-height: 1.3em; }
        .rh-vis-word {
          position: absolute; left: 50%; top: 0; transform: translateX(-50%);
          white-space: nowrap; font-size: clamp(28px, 4vw, 52px); font-weight: 400; color: #1E272D;
        }

        @media (max-width: 640px) {
          .rh-rail { gap: 20px; font-size: 10px; }
          .rh-card { width: clamp(30px, 8vw, 46px); }
          .rh-vis-card { width: clamp(120px, 40vw, 170px); }
          .rh-vis-side { display: none; }
        }
      `}</style>
    </section>
  );
}
