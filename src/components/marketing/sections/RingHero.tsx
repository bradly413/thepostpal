"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import PosterboyLogo from "@/components/PosterboyLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Inkwell-inspired cinematic hero, one pinned master timeline:
//   Phase 1 — 20 real post-images orbit the serif posterboy wordmark; ring spins.
//   Transition — ring scales up + fades (you "pass through" it), center fades.
//   Phase 2 (VISION) — a card thickens into a 3D deck, then FANS open into a
//             diagonal 3D cascade receding into space (the inkwell motion).
//
// 2D/3D CSS transforms (no WebGL). Lenis-gated; reduced-motion stays static.

const IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/hero-ring/${String(i + 1).padStart(2, "0")}.jpg`,
);

// The cascade reuses the post-images as a deck that fans into 3D.
const CASCADE = IMAGES;

const SECTIONS = ["INTRO", "VISION", "INTELLIGENCE", "APPLICATIONS"];

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

      // Cascade starts as a tight centered stack (a "deck" with thin edges).
      gsap.set(".rh-casc-card", { xPercent: -50, yPercent: -50, x: 0, y: 0, z: (i) => -i * 4 });

      if (reducedMotion) {
        gsap.set(wheel, { rotation: 0 });
        gsap.set(".rh-cascade", { autoAlpha: 0 });
        gsap.from(".rh-center > *", { autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.6 });
        return;
      }

      gsap.set(".rh-cascade", { autoAlpha: 0 });
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
          end: "+=5600",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // Phase 1: ring spins a full turn.
      tl.to(wheel, { rotation: 360, ease: "none", duration: 5 });

      // Transition: pass through the ring; center fades.
      tl.to(wheel, { scale: 4.4, autoAlpha: 0, ease: "power2.in", duration: 1.6 })
        .to(".rh-center", { autoAlpha: 0, scale: 1.3, ease: "power2.in", duration: 1.6 }, "<");

      // Phase 2: VISION — deck appears, thickens, then fans into a 3D cascade.
      tl.to(".rh-cascade", { autoAlpha: 1, duration: 0.5 });
      // thicken the deck
      tl.to(".rh-casc-card", { z: (i) => -i * 18, duration: 1, ease: "none" });
      // fan open into the diagonal cascade (up-right, receding)
      tl.to(".rh-casc-card", {
        x: (i) => i * 30,
        y: (i) => -i * 20,
        z: (i) => -i * 66,
        rotateY: 2,
        duration: 3.4,
        stagger: 0.015,
        ease: "power1.inOut",
      });
      // copy fades in with the cascade
      tl.from(".rh-casc-copy > *", { autoAlpha: 0, y: 16, stagger: 0.12, duration: 0.8 }, "<0.5");

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

        {/* Phase 2 — VISION 3D cascade */}
        <div className="rh-cascade" aria-hidden>
          <div className="rh-casc-deck">
            {CASCADE.map((src, i) => (
              <div
                key={i}
                className="rh-casc-card"
                style={{ backgroundImage: `url(${src})`, zIndex: CASCADE.length - i }}
              />
            ))}
          </div>
          <div className="rh-casc-copy">
            <p className="rh-casc-word">A month of posts</p>
            <p className="rh-casc-line">
              Posterboy turns a blank calendar into a stream of on-brand posts — written, designed,
              and scheduled in your voice.
            </p>
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

        /* ── VISION 3D cascade ── */
        .rh-cascade {
          position: absolute; inset: 0; z-index: 12; pointer-events: none;
          display: flex; align-items: center; justify-content: center;
          perspective: 1600px;
        }
        .rh-casc-deck {
          position: relative; width: 0; height: 0;
          transform-style: preserve-3d;
          transform: translateY(-24px) rotateX(6deg) rotateY(-16deg);
        }
        .rh-casc-card {
          position: absolute; top: 50%; left: 50%;
          width: clamp(150px, 15vw, 224px); aspect-ratio: 4 / 5;
          background-size: cover; background-position: center;
          border-radius: 14px;
          box-shadow: 0 30px 70px -28px rgba(20,25,40,0.45), inset 0 0 0 1px rgba(255,255,255,0.45);
          will-change: transform;
        }
        .rh-casc-copy { position: absolute; left: 0; right: 0; bottom: 13%; text-align: center; }
        .rh-casc-word { margin: 0; font-size: clamp(24px, 3.4vw, 44px); font-weight: 400; color: #1E272D; }
        .rh-casc-line {
          margin: 14px auto 0; max-width: 48ch; padding: 0 24px;
          font-size: clamp(14px, 1.4vw, 17px); font-weight: 300; color: rgba(30,39,45,0.45); line-height: 1.5;
        }

        @media (max-width: 640px) {
          .rh-rail { gap: 20px; font-size: 10px; }
          .rh-card { width: clamp(30px, 8vw, 46px); }
          .rh-casc-card { width: clamp(120px, 40vw, 180px); }
        }
      `}</style>
    </section>
  );
}
