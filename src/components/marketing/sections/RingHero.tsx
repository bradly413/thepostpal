"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import PosterboyLogo from "@/components/PosterboyLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Inkwell-inspired cinematic hero: 24 real generated-post images orbit the serif
// posterboy wordmark; the ring rotates a full turn, scrubbed to scroll, while the
// hero is pinned. The metaphor — your content, AI-built, circling the brand.
//
// 2D CSS-transform ring (not WebGL): lighter + an exact match to the reference.
// Honors prefers-reduced-motion (static ring, no pin) via the scroll provider.

const IMAGES = Array.from(
  { length: 24 },
  (_, i) => `/hero-ring/${String(i + 1).padStart(2, "0")}.jpg`,
);

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

      // Lay the cards out on a circle; each card faces outward (tangent).
      const place = () => {
        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.38;
        cards.forEach((card, i) => {
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2; // start at top
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

      // Reduced motion: a calm static ring, no pin, no spin.
      if (reducedMotion) {
        gsap.set(wheel, { rotation: 0 });
        gsap.from(".rh-center > *", { autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.6 });
        return;
      }

      // Gentle entrance, then scrub a full rotation while pinned.
      gsap.from(".rh-card", { autoAlpha: 0, scale: 0.86, stagger: { each: 0.02, from: "random" }, duration: 0.7, ease: "power2.out" });

      gsap.to(wheel, {
        rotation: 360,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=2600",
          pin: true,
          scrub: 1,
        },
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
      {/* Inkwell-style section rail */}
      <nav className="rh-rail" aria-label="Sections">
        {SECTIONS.map((s, i) => (
          <span key={s} className={`rh-rail-item${i === 0 ? " is-active" : ""}`}>
            {s}
          </span>
        ))}
      </nav>

      <div className="rh-stage">
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
      </div>

      <style>{`
        .rh {
          position: relative;
          background: #F6F8FA;
          color: #1E272D;
        }
        .rh-rail {
          position: absolute; top: 0; left: 0; right: 0; z-index: 20;
          display: flex; gap: 34px; justify-content: center;
          padding: 28px 0;
          font-family: ui-monospace, "Roboto Mono", "SFMono-Regular", Menlo, monospace;
          font-size: 11px; letter-spacing: 0.18em;
        }
        .rh-rail-item { color: rgba(30,39,45,0.32); transition: color 0.3s ease; cursor: default; }
        .rh-rail-item.is-active { color: #1E272D; }

        .rh-stage {
          position: relative;
          height: 100vh;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .rh-center {
          position: relative; z-index: 10; text-align: center; pointer-events: none;
          transform: translateY(36px); /* drop below the header for breathing room */
        }
        .rh-center .rh-logo {
          font-size: clamp(40px, 6vw, 76px);
          color: #1E272D;
          line-height: 1;
        }
        .rh-tagline {
          margin: 22px 0 0;
          font-size: clamp(14px, 1.4vw, 17px);
          font-weight: 300;
          letter-spacing: 0.01em;
          color: rgba(30,39,45,0.78);
        }
        .rh-scroll {
          margin: 14px 0 0;
          font-family: ui-monospace, "Roboto Mono", "SFMono-Regular", Menlo, monospace;
          font-size: 11px; letter-spacing: 0.22em;
          color: rgba(30,39,45,0.5);
        }

        /* Rotation pivot at exact viewport center */
        .rh-wheel {
          position: absolute; top: calc(50% + 36px); left: 50%;
          width: 0; height: 0;
          transform-origin: center center;
          will-change: transform;
        }
        .rh-card {
          position: absolute; top: 0; left: 0;
          width: clamp(32px, 3.5vw, 52px);
          aspect-ratio: 4 / 5;
          border-radius: 0;
          background-size: cover;
          background-position: center;
          box-shadow: 0 14px 34px -12px rgba(20,25,40,0.28);
          transform-origin: center center;
        }

        @media (max-width: 640px) {
          .rh-rail { gap: 20px; font-size: 10px; }
          .rh-card { width: clamp(24px, 6.5vw, 36px); }
        }
      `}</style>
    </section>
  );
}
