"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import PosterboyLogo from "@/components/PosterboyLogo";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase, SplitText);

CustomEase.create("cineFlow", "0.33,0,0.2,1");

// ONE set of 20 cards carried through the timeline:
//   Phase 1 — the post-images orbit the wordmark; the ring spins one full turn.
//            Cards near the cursor flip in 3D + scale; the ring parallax-tilts
//            toward the cursor (the inkwell "alive" feel).
//   Collapse — the cards fly inward and stack behind card 0 (breakfast flatlay).
//   Phase 2 — 9 cards spread into a diagonal line; each pops forward on scroll
//            and its matching title reveals word-by-word (SplitText).
//
// Card material = native LUME effect: dark image "planes" that brighten where a
// cursor-following light falls.

const IMAGES = [
  "/hero-ring/01.jpg", // Restaurants — brunch
  "/hero-ring/06.jpg", // Salons
  "/hero-ring/13.jpg", // Dentists — scrubs
  "/hero-ring/02.jpg", // Real estate — house
  "/hero-ring/04.jpg", // Florists — roses
  "/hero-ring/19.jpg", // Med spas — beauty
  "/hero-ring/07.jpg", // Retail — clothing
  "/hero-ring/11.jpg", // Cafés — coffee
  "/hero-ring/14.jpg", // Fitness — smoothie
  "/hero-ring/03.jpg",
  "/hero-ring/05.jpg",
  "/hero-ring/08.jpg",
  "/hero-ring/09.jpg",
  "/hero-ring/10.jpg",
  "/hero-ring/12.jpg",
  "/hero-ring/15.jpg",
  "/hero-ring/16.jpg",
  "/hero-ring/17.jpg",
  "/hero-ring/18.jpg",
  "/hero-ring/20.jpg",
];

const LINE = 9;

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
const RING_END = 0.2; // proximity-flip interactivity active below this scroll progress

const NAV = [
  { label: "How", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function RingHero() {
  const root = useRef<HTMLElement | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const { ready, reducedMotion, scrollToAnchor } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const wheel = wheelRef.current;
      const parallax = parallaxRef.current;
      const section = root.current;
      if (!wheel || !parallax || !section) return;

      const cards = gsap.utils.toArray<HTMLElement>(".rh-card");
      const titles = gsap.utils.toArray<HTMLElement>(".rh-casc-title");
      const lineCards = cards.slice(0, LINE);
      const N = cards.length;

      // Conveyor geometry. `t` is the focal index (0..LINE-1) driven by scroll.
      // Each card's phase = i - t: phase 0 = focal (front, bright); phase > 0 =
      // still queued (receding up-right, dim); phase < 0 = bumped out of line,
      // trailing down-left. The card at the focal point is the "current" one.
      const FX = -50,
        FY = -70,
        FZ = 210,
        FS = 1.22;
      const conveyorPos = (i: number, t: number) => {
        const ph = i - t;
        if (ph >= 0) {
          const k = ph;
          return {
            x: FX + k * 72,
            y: FY - k * 40,
            z: FZ - k * 150,
            s: Math.max(0.5, FS - k * 0.05),
            ry: 4,
            dim: Math.min(0.62, k * 0.16),
          };
        }
        const k = -ph;
        return {
          x: FX - k * 168,
          y: FY + k * 30,
          z: FZ - k * 70,
          s: Math.max(0.42, FS - k * 0.11),
          ry: -8,
          dim: Math.min(0.5, 0.1 + k * 0.16),
        };
      };
      const CONVEYOR_START = 0.3;

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

      gsap.set(".rh-casc-copy", { autoAlpha: 0 });

      if (reducedMotion) {
        gsap.from(".rh-center > *", { autoAlpha: 0, y: 12, stagger: 0.08, duration: 0.6 });
        return;
      }

      // Word-by-word title reveals (SplitText), hidden below their clip box.
      const splits = titles.map((t) => new SplitText(t, { type: "words", wordsClass: "rh-word" }));
      splits.forEach((s) => gsap.set(s.words, { yPercent: 125 }));

      // Ring starts small and grows as you scroll into it.
      gsap.set(wheel, { scale: 0.7 });

      gsap.from(".rh-card", {
        autoAlpha: 0,
        stagger: { each: 0.02, from: "random" },
        duration: 0.7,
        ease: "power2.out",
      });

      // ── Interactive layer: proximity flip (ring) + light (lineup) + parallax ──
      let progress = 0;
      let rafId = 0;
      let ptr: { x: number; y: number } | null = null;
      const ringSt = cards.map(() => ({ rot: 0, sf: 0 }));
      const par = { cx: 0, cy: 0, cz: 0 };
      let ringWasActive = false;
      const SENS = 520,
        FALLOFF = 260;
      const seed = () => {
        const r = section.getBoundingClientRect();
        ptr = { x: r.left + r.width * 0.42, y: r.top + r.height * 0.46 };
      };
      const loop = () => {
        rafId = requestAnimationFrame(loop);
        const p = ptr;
        // parallax container tilt toward the cursor (ring + lineup phases)
        let tX = 0,
          tY = 0,
          tZ = 0;
        if (p && (progress < RING_END || progress > CONVEYOR_START)) {
          const nx = (p.x - window.innerWidth / 2) / (window.innerWidth / 2);
          const ny = (p.y - window.innerHeight / 2) / (window.innerHeight / 2);
          tX = -ny * 12;
          tY = nx * 12;
          tZ = (nx + ny) * 4;
        }
        par.cx += (tX - par.cx) * 0.1;
        par.cy += (tY - par.cy) * 0.1;
        par.cz += (tZ - par.cz) * 0.1;
        gsap.set(parallax, { rotateX: par.cx, rotateY: par.cy, rotation: par.cz });

        if (p && progress < RING_END) {
          ringWasActive = true;
          cards.forEach((card, i) => {
            const r = card.getBoundingClientRect();
            const d = Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + r.height / 2));
            const ff = d < SENS ? Math.max(0, 1 - d / FALLOFF) : 0;
            const st = ringSt[i];
            st.rot += (180 * ff - st.rot) * 0.15;
            st.sf += (0.3 * ff - st.sf) * 0.15;
            gsap.set(card, { rotationY: st.rot, scale: RING_SCALE * (1 + st.sf) });
          });
        } else if (ringWasActive) {
          ringWasActive = false;
          cards.forEach((card, i) => {
            ringSt[i].rot = 0;
            ringSt[i].sf = 0;
            gsap.set(card, { rotationY: 0, scale: RING_SCALE });
          });
        }

        if (progress > CONVEYOR_START) {
          // Scroll position -> focal index. Cards bump out of line one by one.
          const t = Math.min(1, (progress - CONVEYOR_START) / (1 - CONVEYOR_START)) * (LINE - 1);
          lineCards.forEach((card, i) => {
            const c = conveyorPos(i, t);
            gsap.set(card, { x: c.x, y: c.y, z: c.z, scale: c.s, rotateY: c.ry, rotation: 0, "--dim-base": c.dim });
            // matching title slides with the card (focal = readable, else clipped away)
            gsap.set(splits[i].words, {
              yPercent: (j: number) => Math.max(-135, Math.min(135, (i - t) * 200 + j * 8)),
            });
          });
          // cursor light on top of the conveyor
          if (p) {
            lineCards.forEach((c) => {
              const r = c.getBoundingClientRect();
              const d = Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + r.height / 2));
              c.style.setProperty("--shine", Math.max(0, 0.7 * (1 - d / 420)).toFixed(3));
            });
          }
        }
      };
      const onMove = (e: PointerEvent) => {
        ptr = { x: e.clientX, y: e.clientY };
      };
      seed();
      section.addEventListener("pointermove", onMove);
      rafId = requestAnimationFrame(loop);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=7000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            progress = self.progress;
          },
        },
      });

      tl.set(cards, { opacity: 1 }, 0);

      // Phase 1 — one full clockwise turn, the ring growing as you scroll in
      // (caps at 1.0 — its natural size — so the top cards never reach the nav).
      tl.to(wheel, { rotation: 360, scale: 1, ease: "none", duration: 5 });

      // Collapse — the ring resolves straight into the conveyor's start state:
      // card 0 at the focal point (front, bright), the rest queued behind it,
      // receding up-right. The scroll-driven loop takes over from here.
      tl.to(
        lineCards,
        {
          x: (i: number) => conveyorPos(i, 0).x,
          y: (i: number) => conveyorPos(i, 0).y,
          z: (i: number) => conveyorPos(i, 0).z,
          scale: (i: number) => conveyorPos(i, 0).s,
          rotateY: (i: number) => conveyorPos(i, 0).ry,
          rotation: 0,
          "--dim-base": (i: number) => conveyorPos(i, 0).dim,
          duration: 1.7,
          ease: "cineFlow",
          stagger: { each: 0.03, from: "end" },
        },
        "collapse",
      );
      tl.to(
        cards.slice(LINE),
        { x: 0, y: 0, z: 0, scale: 1, rotation: 0, rotateY: 0, autoAlpha: 0, duration: 1.2, ease: "power2.in" },
        "collapse",
      );
      tl.to(wheel, { scale: 1, duration: 1.7, ease: "cineFlow" }, "collapse");
      tl.to(".rh-center", { autoAlpha: 0, scale: 1.1, ease: "power2.in", duration: 1.2 }, "collapse");
      tl.to(".rh-casc-copy", { autoAlpha: 1, duration: 0.8 }, "collapse+=0.8");

      // Spacer — holds the timeline still so the rest of the pinned scroll
      // (progress > CONVEYOR_START) is driven by the conveyor loop. Sized so
      // the collapse finishes right at CONVEYOR_START.
      const introEnd = 6.7; // spin(5) + collapse(1.7)
      const spacer = (introEnd / CONVEYOR_START) * (1 - CONVEYOR_START);
      tl.to({}, { duration: spacer });

      const onResize = () => {
        ScrollTrigger.refresh();
        seed();
      };
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        section.removeEventListener("pointermove", onMove);
        if (rafId) cancelAnimationFrame(rafId);
        splits.forEach((s) => s.revert());
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
          <p className="rh-tagline">You run the place. We&rsquo;ll run the feed.</p>
          <p className="rh-scroll">SCROLL&nbsp;&nbsp;TO&nbsp;&nbsp;EXPLORE</p>
        </div>

        <div ref={parallaxRef} className="rh-parallax">
          <div ref={wheelRef} className="rh-wheel" aria-hidden>
            {IMAGES.map((src, i) => (
              <div
                key={src}
                className="rh-card"
                style={{ backgroundImage: `url(${src})`, zIndex: IMAGES.length - i }}
              />
            ))}
          </div>
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

        .rh-parallax { position: absolute; inset: 0; transform-style: preserve-3d; will-change: transform; }
        .rh-wheel {
          position: absolute; top: calc(50% + 36px); left: 50%;
          width: 0; height: 0; transform-style: preserve-3d; will-change: transform;
        }
        /* Card = image "plane". A dark veil dims it; the cursor light lifts the
           veil and adds a soft glow where it falls (native LUME look). */
        .rh-card {
          position: absolute; top: 0; left: 0;
          width: clamp(150px, 15vw, 224px); aspect-ratio: 4 / 5;
          background-size: cover; background-position: center; background-color: #000;
          border-radius: 0; opacity: 1; isolation: isolate; will-change: transform;
          --dim-base: 0; --shine: 0; backface-visibility: hidden;
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
        .rh-casc-titles { position: relative; height: 1.25em; }
        .rh-casc-title {
          position: absolute; left: 0; top: 0; margin: 0; display: block; white-space: nowrap; overflow: hidden;
          padding-bottom: 0.08em;
          font-size: clamp(28px, 4vw, 52px); font-weight: 400; color: #1E272D; line-height: 1.2;
        }
        .rh-word { display: inline-block; will-change: transform; }
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
