"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import PosterboyLogo from "@/components/PosterboyLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);

CustomEase.create("cineFlow", "0.33,0,0.2,1");

// ONE set of 20 cards carried through the timeline:
//   Phase 1 — the post-images orbit the wordmark; the ring spins one full turn.
//   Collapse — the cards fly inward and stack behind card 0 (breakfast flatlay).
//   Phase 2 — 9 cards spread into a diagonal receding LINE; the rest fade out.
//
// Card material = native LUME effect: dark image "planes" that brighten where a
// cursor-following light falls, and the whole line tilts toward the cursor.

const IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/hero-ring/${String(i + 1).padStart(2, "0")}.jpg`,
);

const LINE = 9; // cards that stay and line up after the stack

// One industry per lined-up card; the title flips as each card slides out.
const INDUSTRIES = [
  "Restaurants",
  "Salons",
  "Dentists",
  "Real estate",
  "Florists",
  "Med spas",
  "Retail",
  "Cafés",
  "Fitness",
];

const RING_SCALE = 0.29;

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
      const titles = gsap.utils.toArray<HTMLElement>(".rh-casc-title");
      const lineCards = cards.slice(0, LINE);
      const N = cards.length;

      const place = () => {
        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.38;
        cards.forEach((card, i) => {
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
          gsap.set(card, {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
            z: 0,
            xPercent: -50,
            yPercent: -50,
            rotation: (angle * 180) / Math.PI + 90,
            rotateY: 0,
            scale: RING_SCALE,
            opacity: 1,
          });
        });
      };
      place();

      gsap.set(titles, { rotationX: -75, autoAlpha: 0, transformOrigin: "50% 100%" });
      if (titles[0]) gsap.set(titles[0], { rotationX: 0, autoAlpha: 1 });
      gsap.set(".rh-casc-copy", { autoAlpha: 0 });
      gsap.set(wheel, { "--dim-base": 0 });

      if (reducedMotion) {
        gsap.from(".rh-center > *", { autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.6 });
        return;
      }

      gsap.from(".rh-card", {
        autoAlpha: 0,
        stagger: { each: 0.02, from: "random" },
        duration: 0.7,
        ease: "power2.out",
      });

      // ── Native LUME light: cursor-following shine + group tilt ──
      const tiltX = gsap.quickTo(wheel, "rotationX", { duration: 0.5, ease: "power2.out" });
      const tiltY = gsap.quickTo(wheel, "rotationY", { duration: 0.5, ease: "power2.out" });
      let progress = 0;
      let rafId = 0;
      let point: { x: number; y: number } | null = null;
      const seedLight = () => {
        const rect = section.getBoundingClientRect();
        // default light over the front card so the line reads even before the cursor moves
        point = { x: rect.left + rect.width * 0.42, y: rect.top + rect.height * 0.46 };
      };
      const applyLight = () => {
        rafId = 0;
        const p = point;
        if (!p) return;
        if (progress <= 0.62) {
          tiltX(0);
          tiltY(0);
          lineCards.forEach((c) => c.style.setProperty("--shine", "0"));
          return;
        }
        const rect = section.getBoundingClientRect();
        tiltY(((p.x - rect.left) / rect.width - 0.5) * 16);
        tiltX(-((p.y - rect.top) / rect.height - 0.5) * 14);
        lineCards.forEach((c) => {
          const r = c.getBoundingClientRect();
          const d = Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + r.height / 2));
          c.style.setProperty("--shine", Math.max(0, 0.85 * (1 - d / 340)).toFixed(3));
        });
      };
      const schedule = () => {
        if (!rafId) rafId = requestAnimationFrame(applyLight);
      };
      const onMove = (e: PointerEvent) => {
        point = { x: e.clientX, y: e.clientY };
        schedule();
      };
      seedLight();
      section.addEventListener("pointermove", onMove);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=5200",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            progress = self.progress;
            schedule();
          },
        },
      });

      tl.set(cards, { opacity: 1 }, 0);

      // Phase 1 — one full clockwise turn.
      tl.to(wheel, { rotation: 360, ease: "none", duration: 5 });

      // Collapse — every card stacks behind card 0 (the breakfast flatlay).
      tl.to(
        cards,
        {
          x: 0,
          y: 0,
          z: (i) => -i * 4,
          rotation: 0,
          rotateY: 0,
          scale: 1,
          duration: 1.7,
          ease: "cineFlow",
          stagger: { each: 0.03, from: "end" },
        },
        "collapse",
      );
      tl.to(".rh-center", { autoAlpha: 0, scale: 1.1, ease: "power2.in", duration: 1.2 }, "collapse");
      tl.to(".rh-casc-copy", { autoAlpha: 1, duration: 0.8 }, "collapse+=0.8");

      tl.to(cards, { z: (i) => -i * 18, duration: 0.8, ease: "none" });

      // Phase 2 — dim into "planes", drop the extra cards, line up 9.
      tl.addLabel("lineup");
      tl.to(wheel, { "--dim-base": 0.8, duration: 0.8 }, "lineup");
      tl.to(cards.slice(LINE), { autoAlpha: 0, duration: 0.6, ease: "power2.in" }, "lineup");

      const STEPX = 104,
        STEPY = 34,
        STEPZ = 132;
      lineCards.forEach((card, i) => {
        tl.to(
          card,
          { x: i * STEPX, y: -i * STEPY, z: -i * STEPZ, rotateY: 3, duration: 0.5, ease: "power2.out" },
          i === 0 ? "lineup" : "<0.2",
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
        ScrollTrigger.refresh();
        seedLight();
      };
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        section.removeEventListener("pointermove", onMove);
        if (rafId) cancelAnimationFrame(rafId);
      };
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
        <div className="rh-center">
          <PosterboyLogo href={null} className="rh-logo" />
          <p className="rh-tagline">The future is built on Artificial Intelligence.</p>
          <p className="rh-scroll">SCROLL&nbsp;&nbsp;TO&nbsp;&nbsp;EXPLORE</p>
        </div>

        <div ref={wheelRef} className="rh-wheel" aria-hidden>
          {IMAGES.map((src, i) => (
            <div
              key={src}
              className="rh-card"
              style={{ backgroundImage: `url(${src})`, zIndex: IMAGES.length - i }}
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
        .rh-rail-nav a { color: rgba(30,39,45,0.5); text-decoration: none; transition: color 0.25s ease; }
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
          position: relative; height: 100vh; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          perspective: 1600px;
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
          width: 0; height: 0; transform-style: preserve-3d; will-change: transform;
          --dim-base: 0;
        }
        /* Card = image "plane". A dark veil dims it; the cursor light lifts the
           veil and adds a soft glow where it falls (native LUME look). */
        .rh-card {
          position: absolute; top: 0; left: 0;
          width: clamp(150px, 15vw, 224px); aspect-ratio: 4 / 5;
          background-size: cover; background-position: center; background-color: #000;
          border-radius: 0; opacity: 1; isolation: isolate; will-change: transform;
          --shine: 0;
        }
        .rh-card::after {
          content: ""; position: absolute; inset: 0; pointer-events: none; background: #000;
          opacity: max(0, calc(var(--dim-base, 0) - var(--shine, 0)));
          transition: opacity 0.12s ease-out;
        }
        .rh-card::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: soft-light;
          background: radial-gradient(circle at 50% 45%, rgba(255,255,255,0.95), rgba(255,255,255,0) 72%);
          opacity: calc(var(--shine, 0) * 0.8);
          transition: opacity 0.12s ease-out;
        }

        .rh-casc-copy { position: absolute; left: clamp(24px, 5vw, 72px); bottom: 12%; z-index: 14; text-align: left; max-width: 32ch; }
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
          .rh-card { width: clamp(120px, 40vw, 180px); }
        }
      `}</style>
    </section>
  );
}
