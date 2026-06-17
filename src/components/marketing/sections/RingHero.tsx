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

// Cinematic easings (per gsap-cinematic-scroll-3d house set).
CustomEase.create("cineFlow", "0.33,0,0.2,1");
CustomEase.create("cineSilk", "0.45,0.05,0.55,0.95");

// ONE set of cards carried through the whole timeline:
//   Phase 1 — the 20 post-images orbit the wordmark; the ring spins one full turn.
//   Collapse — the cards fly inward and STACK behind the card they land on
//              (card 0 = the breakfast flatlay), forming an opaque deck.
//   Phase 2 (VISION) — the deck fans into a diagonal 3D cascade, the cards
//              turning to translucent thick-glass as they spread; a bottom-left
//              title flips through local-business verticals as each card bumps out.
//
// CSS 3D (no WebGL). Lenis-gated; reduced-motion stays a static ring.

// Curated deck — each card's image is paired to the vertical it represents,
// so the title that flips in actually matches the photo. Breakfast/Restaurants
// is card 0 (the anchor the ring collapses onto).
const CARDS = [
  { img: "/hero-ring/01.jpg", word: "Restaurants" },
  { img: "/hero-ring/06.jpg", word: "Salons" },
  { img: "/hero-ring/13.jpg", word: "Dentists" },
  { img: "/hero-ring/02.jpg", word: "Real estate" },
  { img: "/hero-ring/04.jpg", word: "Florists" },
  { img: "/hero-ring/19.jpg", word: "Med spas" },
  { img: "/hero-ring/07.jpg", word: "Retail" },
  { img: "/hero-ring/11.jpg", word: "Cafés" },
  { img: "/hero-ring/16.jpg", word: "Bakeries" },
  { img: "/hero-ring/14.jpg", word: "Fitness" },
  { img: "/hero-ring/10.jpg", word: "Home services" },
  { img: "/hero-ring/12.jpg", word: "Auto shops" },
];

// Ring cards are the same slabs scaled down — keeps image crisp (downscale, not up).
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
      const N = cards.length;

      // Lay the cards out on the ring (billboarded, scaled down, opaque).
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

      // The flip-title stack starts on the first vertical, the rest folded away.
      gsap.set(titles, { rotationX: -75, autoAlpha: 0, transformOrigin: "50% 100%" });
      if (titles[0]) gsap.set(titles[0], { rotationX: 0, autoAlpha: 1 });
      gsap.set(".rh-casc-copy", { autoAlpha: 0 });

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

      // Anchor opacity at the start so scrubbing back to the top always
      // restores the opaque ring (the fan tween below animates opacity).
      tl.set(cards, { opacity: 1 }, 0);

      // Phase 1 — one full clockwise turn.
      tl.to(wheel, { rotation: 360, ease: "none", duration: 5 });

      // Collapse — cards fly inward and stack behind card 0 (the breakfast flatlay).
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

      // Thicken the deck before it opens.
      tl.to(cards, { z: (i) => -i * 18, duration: 1, ease: "none" });

      // Phase 2 — fan open card-by-card; cards turn to glass, titles flip in.
      const STEPX = 30,
        STEPY = 20,
        STEPZ = 66;
      cards.forEach((card, i) => {
        tl.to(
          card,
          {
            x: i * STEPX,
            y: -i * STEPY,
            z: -i * STEPZ,
            rotateY: 2,
            opacity: i === 0 ? 1 : 0.9,
            duration: 0.5,
            ease: "power2.out",
          },
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

      const onResize = () => ScrollTrigger.refresh();
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
        <div className="rh-center">
          <PosterboyLogo href={null} className="rh-logo" />
          <p className="rh-tagline">The future is built on Artificial Intelligence.</p>
          <p className="rh-scroll">SCROLL&nbsp;&nbsp;TO&nbsp;&nbsp;EXPLORE</p>
        </div>

        <div ref={wheelRef} className="rh-wheel" aria-hidden>
          {CARDS.map((card, i) => (
            <div
              key={card.img}
              className="rh-card"
              style={{ backgroundImage: `url(${card.img})`, zIndex: CARDS.length - i }}
            />
          ))}
        </div>

        <div className="rh-casc-copy">
          <div className="rh-casc-titles">
            {CARDS.map((card) => (
              <span key={card.word} className="rh-casc-title">
                {card.word}
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
        }
        /* Card = thick-glass slab. Ring shows it scaled down + opaque; the fan
           grows it to full size and turns it translucent. */
        /* Thick, bright glass slab — opaque photo, crisp white rim, light-only
           edges (no dark bevel), faint top glare. */
        .rh-card {
          position: absolute; top: 0; left: 0;
          width: clamp(150px, 15vw, 224px); aspect-ratio: 4 / 5;
          background-size: cover; background-position: center;
          border-radius: 0; opacity: 1; isolation: isolate; will-change: transform;
          filter: brightness(1.06) saturate(1.06);
          border: 1.5px solid rgba(255,255,255,0.82);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.45),
            inset 0 3px 4px rgba(255,255,255,0.55),
            inset -3px -4px 8px rgba(255,255,255,0.3);
        }
        .rh-card::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
          background: linear-gradient(125deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.06) 28%, rgba(255,255,255,0) 50%);
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
