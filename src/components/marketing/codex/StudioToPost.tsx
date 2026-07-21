"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// "From studio to post" — the rough idea goes into Posterboy Studio, the image
// renders, then the caption generator writes the post in the owner's voice.
// Copy carried over from the original StudioFlow section (source of truth).
const PROMPT = "brunch spread, soft morning light, top-down";
const CAPTION =
  "Saturday starts slow around here. Pancakes on at 8. No rush, no reservations. Come hungry.";

const STRIP = [
  { src: "/hero-ring/04.jpg", alt: "Florist bouquet made in Studio" },
  { src: "/hero-ring/06.jpg", alt: "Dental practice post image" },
  { src: "/hero-ring/02.jpg", alt: "Home listing post image" },
  { src: "/hero-ring/13.jpg", alt: "Care-team recruiting post image" },
  { src: "/hero-ring/16.jpg", alt: "Sold-home celebration post image" },
  { src: "/hero-ring/11.jpg", alt: "Plated pasta post image" },
  { src: "/hero-ring/19.jpg", alt: "Beauty editorial post image" },
] as const;

/** Split demonstration: rough prompt in, rendered image + finished caption out. */
export default function StudioToPost() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const section = rootRef.current;
      if (!section) return;
      const promptEl = section.querySelector<HTMLElement>(".pbx-sf-prompt-text");
      const capEl = section.querySelector<HTMLElement>(".pbx-sf-caption");
      if (!promptEl || !capEl) return;

      if (reducedMotion) {
        promptEl.textContent = PROMPT;
        capEl.textContent = CAPTION;
        gsap.set(section.querySelectorAll(".pbx-sf-head, .pbx-sf-card, .pbx-sf-arrow, .pbx-sf-strip-item, .pbx-sf-strip-note, .pbx-sf-cap-meta"), {
          opacity: 1,
          y: 0,
        });
        gsap.set(".pbx-sf-cover", { scaleX: 0 });
        return;
      }

      const typer = (el: HTMLElement, text: string, duration: number) => {
        const o = { n: 0 };
        return gsap.to(o, {
          n: text.length,
          duration,
          ease: "none",
          onUpdate: () => {
            el.textContent = text.slice(0, Math.round(o.n));
          },
        });
      };

      gsap.set(".pbx-sf-cover", { scaleX: 1, transformOrigin: "right center" });

      // One section-scoped timeline. Reverses only after a full exit — the
      // trigger spans the section with generous margins so scroll jitter near
      // the threshold cannot re-fire it.
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 72%",
          end: "bottom 15%",
          toggleActions: "play none none reverse",
        },
      });

      tl.fromTo(".pbx-sf-head", { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.6 });
      tl.fromTo(
        ".pbx-sf-card",
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.16 },
        "-=0.25",
      );
      tl.add(typer(promptEl, PROMPT, 0.8), ">-0.15");
      // Image resolves: cover wipes away, photo settles from a soft blur.
      tl.to(".pbx-sf-cover", { scaleX: 0, duration: 0.8, ease: "power2.inOut" }, ">-0.05");
      tl.fromTo(
        ".pbx-sf-frame img",
        { scale: 1.1, filter: "blur(10px)" },
        { scale: 1, filter: "blur(0px)", duration: 0.9 },
        "<",
      );
      tl.fromTo(".pbx-sf-arrow", { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.45 }, ">-0.2");
      // Caption slides up into its finished position while it types.
      tl.fromTo(".pbx-sf-cap-body", { y: 18 }, { y: 0, duration: 0.5 }, ">-0.1");
      tl.add(typer(capEl, CAPTION, 1.5), "<");
      tl.fromTo(".pbx-sf-cap-meta", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4 }, ">-0.1");
      tl.fromTo(
        ".pbx-sf-strip-item",
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.45 },
        ">-0.15",
      );
      tl.fromTo(".pbx-sf-strip-note", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, "<0.1");
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbx-sf" id="studio" aria-labelledby="pbx-sf-title" ref={rootRef}>
      <div className="pbx-sf-head">
        <p className="pbx-sf-kicker">From studio to post</p>
        <h2 id="pbx-sf-title">
          Those weren&rsquo;t stock.
          <br />
          <strong>Every one was made here.</strong>
        </h2>
        <p className="pbx-sf-sub">
          Describe it once. Posterboy Studio generates the image, then the caption generator writes
          the post in your voice. The same kind of posts orbiting up top.
        </p>
      </div>

      <div className="pbx-sf-stage">
        <article className="pbx-sf-card">
          <header className="pbx-sf-card-h">
            <span className="pbx-sf-dot" aria-hidden />
            Posterboy Studio
          </header>
          <div className="pbx-sf-prompt">
            <span className="pbx-sf-prompt-label">Prompt</span>
            <span className="pbx-sf-prompt-text" aria-hidden />
            <span className="pbx-sf-caret" aria-hidden />
            <span className="sr-only">{PROMPT}</span>
          </div>
          <div className="pbx-sf-frame">
            <Image
              src="/hero-ring/01.jpg"
              alt="A brunch spread generated in Posterboy Studio"
              width={640}
              height={480}
              sizes="(max-width: 760px) 92vw, 420px"
            />
            <span className="pbx-sf-cover" aria-hidden />
          </div>
        </article>

        <div className="pbx-sf-arrow" aria-hidden>
          <span className="pbx-sf-arrow-line" />
          <span className="pbx-sf-arrow-label">then captioned</span>
        </div>

        <article className="pbx-sf-card">
          <header className="pbx-sf-card-h">
            <span className="pbx-sf-dot" aria-hidden />
            Caption generator
          </header>
          <div className="pbx-sf-cap-row">
            <Image
              className="pbx-sf-cap-thumb"
              src="/hero-ring/01.jpg"
              alt=""
              width={96}
              height={120}
              aria-hidden
            />
            <div className="pbx-sf-cap-body">
              <p className="pbx-sf-caption" aria-hidden />
              <p className="sr-only">{CAPTION}</p>
              <span className="pbx-sf-cap-meta">In your voice · ready to schedule</span>
            </div>
          </div>
        </article>
      </div>

      <div className="pbx-sf-strip">
        <div className="pbx-sf-strip-row">
          {STRIP.map((item) => (
            <Image
              key={item.src}
              src={item.src}
              alt={item.alt}
              width={64}
              height={80}
              className="pbx-sf-strip-item"
            />
          ))}
        </div>
        <p className="pbx-sf-strip-note">
          Every image in the ring above — generated here, then written to match.
        </p>
      </div>

      <style>{`
        .pbx-sf {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(72px, 11vh, 140px) clamp(20px, 3vw, 48px);
          max-width: 1080px;
          margin: 0 auto;
        }
        .pbx-sf-kicker {
          margin: 0 0 14px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-sf h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.06;
          color: var(--ink);
        }
        .pbx-sf h2 strong { color: var(--red); }
        .pbx-sf-sub {
          margin: 16px 0 0;
          max-width: 520px;
          font-size: 15.5px; line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 60%, transparent);
        }
        .pbx-sf-stage {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: clamp(16px, 3vw, 40px);
          margin-top: 52px;
        }
        .pbx-sf-card {
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(20,20,24,0.08);
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 24px 60px -34px rgba(20,25,40,0.4);
          backdrop-filter: blur(8px);
        }
        .pbx-sf-card-h {
          display: flex; align-items: center; gap: 9px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          font-weight: 700;
          color: color-mix(in srgb, var(--ink) 62%, transparent);
          margin-bottom: 14px;
        }
        .pbx-sf-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--red); }
        .pbx-sf-prompt {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 11px 13px; margin-bottom: 14px;
          background: rgba(20,20,24,0.045); border-radius: 10px;
          font-family: ui-monospace, "Roboto Mono", Menlo, monospace; font-size: 13px;
        }
        .pbx-sf-prompt-label {
          font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red); padding: 3px 7px;
          border: 1px solid rgba(238,37,50,0.3); border-radius: 6px;
        }
        .pbx-sf-prompt-text { color: var(--ink); min-height: 1em; }
        .pbx-sf-caret {
          width: 2px; height: 15px; background: var(--ink); display: inline-block;
          animation: pbxSfBlink 1s steps(2) infinite;
        }
        @keyframes pbxSfBlink { 50% { opacity: 0; } }
        .pbx-sf-frame {
          position: relative; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden;
          background: #e8e3da;
        }
        .pbx-sf-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pbx-sf-cover { position: absolute; inset: 0; pointer-events: none; background: #efeae1; }
        .pbx-sf-arrow { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .pbx-sf-arrow-line { width: 46px; height: 1px; background: rgba(20,20,24,0.25); position: relative; }
        .pbx-sf-arrow-line::after {
          content: ""; position: absolute; right: 0; top: -3px;
          border-left: 6px solid rgba(20,20,24,0.4);
          border-top: 4px solid transparent; border-bottom: 4px solid transparent;
        }
        .pbx-sf-arrow-label {
          font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
          white-space: nowrap;
        }
        .pbx-sf-cap-row { display: flex; gap: 14px; align-items: stretch; }
        .pbx-sf-cap-thumb { width: 96px; height: 120px; object-fit: cover; border-radius: 10px; flex: none; }
        .pbx-sf-cap-body { display: flex; flex-direction: column; min-width: 0; }
        .pbx-sf-caption { margin: 0; font-size: 15px; line-height: 1.55; color: var(--ink); min-height: 4.6em; }
        .pbx-sf-cap-meta {
          margin-top: auto;
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
        }
        .pbx-sf-strip { margin-top: 52px; }
        .pbx-sf-strip-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .pbx-sf-strip-item {
          width: 64px; height: 80px; border-radius: 8px; object-fit: cover;
          box-shadow: 0 10px 24px -16px rgba(20,25,40,0.5);
        }
        .pbx-sf-strip-note {
          margin: 14px 0 0;
          font-size: 12.5px;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
        }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        @media (max-width: 760px) {
          .pbx-sf-stage { grid-template-columns: 1fr; }
          .pbx-sf-arrow { flex-direction: row; }
          .pbx-sf-arrow-line { width: 1px; height: 30px; }
          .pbx-sf-arrow-line::after {
            right: -3px; top: auto; bottom: 0;
            border-left: 4px solid transparent; border-right: 4px solid transparent;
            border-top: 6px solid rgba(20,20,24,0.4); border-bottom: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pbx-sf-caret { animation: none; }
        }
      `}</style>
    </section>
  );
}
