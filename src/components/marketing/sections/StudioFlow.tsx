"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// "From studio to post" — the images orbiting in the hero weren't stock.
// This section shows the pipeline: a prompt goes into Posterboy Studio, the
// image renders, then the caption generator writes the post in the owner's
// voice. CSS-3D + GSAP (no WebGL — an image would do most of the job, so we
// keep it light per the 3d-web-experience guidance).

const PROMPT = "brunch spread, soft morning light, top-down";
const CAPTION =
  "Saturday starts slow around here. Pancakes on at 8. No rush, no reservations. Come hungry.";

const STRIP = [
  "/hero-ring/04.jpg",
  "/hero-ring/06.jpg",
  "/hero-ring/02.jpg",
  "/hero-ring/13.jpg",
  "/hero-ring/16.jpg",
  "/hero-ring/11.jpg",
  "/hero-ring/19.jpg",
];

export default function StudioFlow() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const promptEl = section.querySelector<HTMLElement>(".sf-prompt-text");
      const capEl = section.querySelector<HTMLElement>(".sf-caption");
      if (!promptEl || !capEl) return;

      // GSAP-driven typewriter.
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

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        promptEl.textContent = PROMPT;
        capEl.textContent = CAPTION;
        gsap.set(".sf-cover", { scaleX: 0 });
        return;
      }

      gsap.set(".sf-cover", { scaleX: 1, transformOrigin: "right center" });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top 68%", once: true },
      });

      // Cards settle in with a light 3D tilt.
      tl.from(".sf-card", {
        autoAlpha: 0,
        y: 40,
        rotateY: (i: number) => (i ? 12 : -12),
        duration: 0.9,
        stagger: 0.18,
        ease: "power3.out",
      });
      // Prompt types into Studio.
      tl.add(typer(promptEl, PROMPT, 0.85), ">-0.2");
      // Image renders: cover wipes, photo settles, a light sheen sweeps across.
      tl.to(".sf-cover", { scaleX: 0, duration: 0.9, ease: "power3.inOut" }, ">-0.05");
      tl.fromTo(".sf-frame img", { scale: 1.12 }, { scale: 1, duration: 1, ease: "power3.out" }, "<");
      tl.fromTo(
        ".sf-sheen",
        { xPercent: -130, autoAlpha: 0.9 },
        { xPercent: 170, autoAlpha: 0, duration: 0.9, ease: "power2.inOut" },
        "<",
      );
      // Flow to the caption generator.
      tl.from(".sf-arrow", { autoAlpha: 0, x: -14, duration: 0.5, ease: "power2.out" }, ">-0.2");
      tl.from(".sf-cap-thumb", { autoAlpha: 0, scale: 0.9, duration: 0.5, ease: "power3.out" }, "<");
      // Caption writes itself.
      tl.add(typer(capEl, CAPTION, 1.7), ">-0.05");
      tl.from(".sf-cap-meta", { autoAlpha: 0, y: 8, duration: 0.45, ease: "power2.out" }, ">-0.15");
      // Proof strip.
      tl.from(".sf-strip-item", { autoAlpha: 0, y: 16, stagger: 0.05, duration: 0.5, ease: "power3.out" }, ">-0.2");
      tl.from(".sf-strip-note", { autoAlpha: 0, y: 8, duration: 0.5 }, "<0.1");
    },
    { scope: root },
  );

  return (
    <section className="sf" id="studio-flow" ref={root}>
      <div className="sf-head">
        <span className="section-num sf-kicker">From studio to post</span>
        <h2 className="type-h2">
          Those weren&rsquo;t stock.
          <br />
          <em>Every one was made here.</em>
        </h2>
        <p className="type-body sf-sub">
          Describe it once. Posterboy Studio generates the image, then the caption generator writes
          the post in your voice. The same kind of posts orbiting up top.
        </p>
      </div>

      <div className="sf-stage">
        <article className="sf-card sf-studio">
          <header className="sf-card-h">
            <span className="sf-dot" />
            Posterboy Studio
          </header>
          <div className="sf-prompt">
            <span className="sf-prompt-label">Prompt</span>
            <span className="sf-prompt-text" />
            <span className="sf-caret" />
          </div>
          <div className="sf-frame">
            <img src="/hero-ring/01.jpg" alt="A brunch spread generated in Posterboy Studio" />
            <span className="sf-sheen" aria-hidden />
            <span className="sf-cover" aria-hidden />
          </div>
        </article>

        <div className="sf-arrow" aria-hidden>
          <span className="sf-arrow-line" />
          <span className="sf-arrow-label">then captioned</span>
        </div>

        <article className="sf-card sf-caption-card">
          <header className="sf-card-h">
            <span className="sf-dot" />
            Caption generator
          </header>
          <div className="sf-cap-row">
            <img className="sf-cap-thumb" src="/hero-ring/01.jpg" alt="" aria-hidden />
            <div className="sf-cap-body">
              <p className="sf-caption" />
              <span className="sf-cap-meta">In your voice · ready to schedule</span>
            </div>
          </div>
        </article>
      </div>

      <div className="sf-strip">
        <div className="sf-strip-row">
          {STRIP.map((src) => (
            <span key={src} className="sf-strip-item" style={{ backgroundImage: `url(${src})` }} />
          ))}
        </div>
        <p className="sf-strip-note type-caption">
          Every image in the ring above — generated here, then written to match.
        </p>
      </div>

      <style>{`
        .pb-marketing-site .sf {
          padding: clamp(80px, 12vh, 150px) var(--px);
          max-width: 1080px; margin: 0 auto;
        }
        .pb-marketing-site .sf-kicker { color: var(--pb-red); display: block; margin-bottom: 18px; }
        .pb-marketing-site .sf-sub { max-width: 520px; margin-top: 18px; color: var(--quiet-sage); }

        .pb-marketing-site .sf-stage {
          display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
          gap: clamp(16px, 3vw, 40px); margin-top: 56px;
          perspective: 1400px;
        }
        .pb-marketing-site .sf-card {
          background: rgba(255,255,255,0.66);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px; padding: 18px;
          box-shadow: 0 24px 60px -34px rgba(20,25,40,0.4);
          backdrop-filter: blur(6px);
          transform-style: preserve-3d;
        }
        .pb-marketing-site .sf-card-h {
          display: flex; align-items: center; gap: 9px;
          font-family: ui-monospace, "Roboto Mono", Menlo, monospace;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink); opacity: 0.62; margin-bottom: 14px;
        }
        .pb-marketing-site .sf-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pb-red); }

        .pb-marketing-site .sf-prompt {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 11px 13px; margin-bottom: 14px;
          background: rgba(0,0,0,0.035); border-radius: 10px;
          font-family: ui-monospace, "Roboto Mono", Menlo, monospace; font-size: 13px;
        }
        .pb-marketing-site .sf-prompt-label {
          font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--pb-red); padding: 3px 7px; border: 1px solid rgba(238,37,50,0.3); border-radius: 6px;
        }
        .pb-marketing-site .sf-prompt-text { color: var(--ink); }
        .pb-marketing-site .sf-caret {
          width: 2px; height: 15px; background: var(--ink); display: inline-block;
          animation: sfBlink 1s steps(2) infinite;
        }
        @keyframes sfBlink { 50% { opacity: 0; } }

        .pb-marketing-site .sf-frame {
          position: relative; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden;
          background: #e8e3da;
        }
        .pb-marketing-site .sf-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pb-marketing-site .sf-sheen {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.85) 50%, transparent 65%);
        }
        .pb-marketing-site .sf-cover {
          position: absolute; inset: 0; pointer-events: none; background: #efeae1;
        }

        .pb-marketing-site .sf-arrow {
          display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--quiet-sage);
        }
        .pb-marketing-site .sf-arrow-line {
          width: 46px; height: 1px; background: rgba(0,0,0,0.25); position: relative;
        }
        .pb-marketing-site .sf-arrow-line::after {
          content: ""; position: absolute; right: 0; top: -3px;
          border-left: 6px solid rgba(0,0,0,0.4); border-top: 4px solid transparent; border-bottom: 4px solid transparent;
        }
        .pb-marketing-site .sf-arrow-label {
          font-family: ui-monospace, "Roboto Mono", Menlo, monospace;
          font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap;
        }

        .pb-marketing-site .sf-cap-row { display: flex; gap: 14px; align-items: stretch; }
        .pb-marketing-site .sf-cap-thumb {
          width: 96px; height: 120px; object-fit: cover; border-radius: 10px; flex: none;
        }
        .pb-marketing-site .sf-cap-body { display: flex; flex-direction: column; }
        .pb-marketing-site .sf-caption {
          margin: 0; font-size: 15px; line-height: 1.55; color: var(--ink); min-height: 4.6em;
        }
        .pb-marketing-site .sf-cap-meta {
          margin-top: auto; font-family: ui-monospace, "Roboto Mono", Menlo, monospace;
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--quiet-sage);
        }

        .pb-marketing-site .sf-strip { margin-top: 56px; }
        .pb-marketing-site .sf-strip-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .pb-marketing-site .sf-strip-item {
          width: 64px; height: 80px; border-radius: 8px;
          background-size: cover; background-position: center; flex: none;
          box-shadow: 0 10px 24px -16px rgba(20,25,40,0.5);
        }
        .pb-marketing-site .sf-strip-note { margin-top: 16px; color: var(--quiet-sage); }

        @media (max-width: 760px) {
          .pb-marketing-site .sf-stage { grid-template-columns: 1fr; }
          .pb-marketing-site .sf-arrow { flex-direction: row; }
          .pb-marketing-site .sf-arrow-line { width: 1px; height: 30px; }
          .pb-marketing-site .sf-arrow-line::after { right: -3px; top: auto; bottom: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 6px solid rgba(0,0,0,0.4); border-bottom: none; }
        }
      `}</style>
    </section>
  );
}
