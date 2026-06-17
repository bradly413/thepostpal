"use client";

import { useRef } from "react";
import Link from "next/link";
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

// One industry per card — the title flips to the next as each card bumps out.
const INDUSTRIES = [
  "Restaurants",
  "Med spas",
  "Nursing",
  "Florists",
  "Retail",
  "Salons",
  "Realtors",
  "Fitness",
  "Dentists",
  "Cafés",
  "Boutiques",
  "Auto shops",
  "Bakeries",
  "Law firms",
  "Contractors",
  "Pet care",
  "Yoga studios",
  "Coffee",
  "Events",
  "Clinics",
];

const NAV = [
  { label: "How", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function RingHero() {
  const root = useRef<HTMLElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const { ready, reducedMotion, scrollToAnchor } = useMarketingScroll();

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
      const cascCards = gsap.utils.toArray<HTMLElement>(".rh-casc-card");
      const titles = gsap.utils.toArray<HTMLElement>(".rh-casc-title");
      gsap.set(cascCards, { xPercent: -50, yPercent: -50, x: 0, y: 0, z: (i) => -i * 4 });
      gsap.set(titles, { rotationX: -75, autoAlpha: 0, transformOrigin: "50% 100%" });
      if (titles[0]) gsap.set(titles[0], { rotationX: 0, autoAlpha: 1 });

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
      tl.to(cascCards, { z: (i) => -i * 18, duration: 1, ease: "none" });
      // copy rail fades in
      tl.from(".rh-casc-titles", { autoAlpha: 0, y: 16, duration: 0.6 }, "<");
      tl.from(".rh-casc-line", { autoAlpha: 0, y: 16, duration: 0.6 }, "<0.1");
      // fan open card-by-card; each card's industry title flips in as it bumps out
      const STEPX = 30,
        STEPY = 20,
        STEPZ = 66;
      cascCards.forEach((card, i) => {
        tl.to(
          card,
          { x: i * STEPX, y: -i * STEPY, z: -i * STEPZ, rotateY: 2, duration: 0.5, ease: "power2.out" },
          i === 0 ? ">" : "<0.22",
        );
        if (i > 0 && titles[i]) {
          tl.to(titles[i - 1], { rotationX: 75, autoAlpha: 0, duration: 0.25, ease: "power1.in" }, "<0.04").to(
            titles[i],
            { rotationX: 0, autoAlpha: 1, duration: 0.3, ease: "power2.out" },
            "<0.06",
          );
        }
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
    <section ref={root} className="rh" data-hero aria-label="Posterboy — the future is built on AI">
      <header className="rh-rail">
        <PosterboyLogo
          href="#hero"
          className="rh-rail-logo"
          onClick={(e) => {
            e.preventDefault();
            scrollToAnchor("#hero");
          }}
        />
        <nav className="rh-rail-nav" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToAnchor(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Link href="/sign-in" className="rh-rail-cta">
          Sign in
        </Link>
      </header>

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
            <div className="rh-casc-titles">
              {INDUSTRIES.map((w) => (
                <span key={w} className="rh-casc-title">
                  {w}
                </span>
              ))}
            </div>
            <p className="rh-casc-line">
              On-brand posts for every kind of local business — written, designed, and scheduled in
              your voice.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .rh { position: relative; background: #F6F8FA; color: #1E272D; }
        .rh-rail {
          position: absolute; top: 0; left: 0; right: 0; z-index: 20;
          display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
          padding: 22px clamp(20px, 4vw, 56px);
        }
        .rh-rail-logo { justify-self: start; font-size: clamp(18px, 1.5vw, 22px); color: #1E272D; line-height: 1; }
        .rh-rail-nav {
          justify-self: center; display: flex; gap: clamp(22px, 3vw, 44px);
          font-family: ui-monospace, "Roboto Mono", "SFMono-Regular", Menlo, monospace;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
        }
        .rh-rail-nav a {
          color: rgba(30,39,45,0.5); text-decoration: none; transition: color 0.25s ease;
        }
        .rh-rail-nav a:hover { color: #1E272D; }
        .rh-rail-cta {
          justify-self: end;
          font-family: ui-monospace, "Roboto Mono", "SFMono-Regular", Menlo, monospace;
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; text-decoration: none;
          color: #F6F8FA; background: #1E272D; padding: 10px 18px; border-radius: 999px;
          transition: background 0.25s ease, transform 0.2s ease;
        }
        .rh-rail-cta:hover { background: #000; transform: translateY(-1px); }

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
          background-color: rgba(244, 248, 252, 0.12);
          background-blend-mode: soft-light;
          border-radius: 0; opacity: 0.72; isolation: isolate; will-change: transform;
          /* thick-glass edge: beveled rim (inset highlight + depth), no drop shadow */
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.6),
            inset 7px 7px 16px rgba(255,255,255,0.42),
            inset -9px -12px 22px rgba(28,40,58,0.22),
            inset 0 0 30px rgba(255,255,255,0.16);
        }
        /* specular sheen — the glare of light across glass */
        .rh-casc-card::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
          background:
            linear-gradient(118deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.12) 16%, rgba(255,255,255,0) 38%),
            linear-gradient(305deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 16%);
        }
        /* inner pane — the second edge that sells the slab's thickness */
        .rh-casc-card::after {
          content: ""; position: absolute; inset: 5px; pointer-events: none;
          border: 1px solid rgba(255,255,255,0.32);
          background: linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 42%);
        }
        .rh-casc-copy { position: absolute; left: clamp(24px, 5vw, 72px); bottom: 12%; text-align: left; max-width: 32ch; }
        .rh-casc-titles { position: relative; height: 1.2em; perspective: 800px; }
        .rh-casc-title {
          position: absolute; left: 0; top: 0; margin: 0; display: block; white-space: nowrap;
          font-size: clamp(28px, 4vw, 52px); font-weight: 400; color: #1E272D; line-height: 1.2;
          transform-origin: 50% 100%; backface-visibility: hidden;
        }
        .rh-casc-line {
          margin: 20px 0 0; max-width: 32ch;
          font-size: clamp(14px, 1.4vw, 17px); font-weight: 300; color: rgba(30,39,45,0.45); line-height: 1.5;
        }

        @media (max-width: 640px) {
          .rh-rail { padding: 18px 20px; }
          .rh-rail-nav { display: none; }
          .rh-card { width: clamp(30px, 8vw, 46px); }
          .rh-casc-card { width: clamp(120px, 40vw, 180px); }
        }
      `}</style>
    </section>
  );
}
