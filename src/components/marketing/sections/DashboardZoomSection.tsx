"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

const KICKER = "The Posterboy studio";
const HEADLINE = "Describe it. Posterboy makes the picture.";
const LEDE =
  "Type what you want to see — a hero shot, a flat-lay, a seasonal scene. Posterboy's studio generates it on brand and post-ready, in seconds. No photographer, no stock library, no design tools.";

// Each "shot": the prompt a user types, and the image the studio generates.
// (Mocks stand in for generated output until real studio renders are wired.)
const SHOTS = [
  { label: "Florist", prompt: "sunlit peonies on a linen runner, soft window light", src: "/images/social-mocks/02.png" },
  { label: "Landscaping", prompt: "a golden-hour backyard with a winding stone path", src: "/images/social-mocks/01.png" },
  { label: "Creator", prompt: "a vibrant summer portrait — citrus, bold florals", src: "/images/social-mocks/05.png" },
  { label: "Home services", prompt: "a friendly technician by the van, clean and on-brand", src: "/images/social-mocks/03.png" },
];

// Small range strip beneath the generator — "look what it makes."
const MORE = [
  "/images/social-mocks/06.png",
  "/images/social-mocks/08.png",
  "/images/social-mocks/04.png",
  "/images/social-mocks/07.png",
  "/images/social-mocks/09.png",
  "/images/social-mocks/10.png",
];

const TILE_COLS = 7;
const TILE_ROWS = 9;
const TILE_N = TILE_COLS * TILE_ROWS;
const TILES = Array.from({ length: TILE_N }, (_, i) => ({
  i,
  // Scattered, deterministic order — reads like pixels denoising in, not a sweep.
  delay: (((i * 131) % TILE_N) / TILE_N) * 0.9,
}));

type Phase = "typing" | "generating" | "done";

/**
 * The Posterboy studio — AI image generator. A prompt types in; the dark render
 * canvas "computes" behind a brand-red scan + glow, then dissolves tile-by-tile
 * to reveal the finished image. Cycles business types; chips also jump. A small
 * range strip beneath shows the volume. Self-contained + reduced-motion safe.
 */
export default function DashboardZoomSection() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const reduced = useRef(false);
  const shot = SHOTS[idx % SHOTS.length];

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setTyped(shot.prompt);
      setPhase("done");
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };

    setTyped("");
    setPhase("typing");
    const speed = 40;
    for (let c = 1; c <= shot.prompt.length; c++) {
      at(() => setTyped(shot.prompt.slice(0, c)), 320 + c * speed);
    }
    const typedDone = 320 + shot.prompt.length * speed;
    at(() => setPhase("generating"), typedDone + 360);
    at(() => setPhase("done"), typedDone + 360 + 2600);
    at(() => setIdx((i) => (i + 1) % SHOTS.length), typedDone + 360 + 2600 + 3400);

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <section id="studio" className="studio-gen" aria-label="The Posterboy studio — AI image generator">
      <div className="sg-intro">
        <p className="sg-kicker" data-reveal="up-sm">{KICKER}</p>
        <h2 className="type-display sg-title" data-reveal>{HEADLINE}</h2>
        <p className="sg-lede" data-reveal>{LEDE}</p>
      </div>

      <div className="sg-stage" data-reveal="up-lg">
        <div className="sg-bar">
          <span className="sg-bar-spark" aria-hidden>
            <Sparkles size={15} strokeWidth={2} />
          </span>
          <span className="sg-bar-text">
            {typed}
            {phase === "typing" && !reduced.current ? <span className="sg-caret" /> : null}
          </span>
          <span className={`sg-bar-btn sg-bar-btn--${phase}`} aria-hidden>
            {phase === "done" ? "Done" : "Generate"}
          </span>
        </div>

        <div className={`sg-canvas sg-${phase}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.src} alt={`Studio render — ${shot.label}`} loading="lazy" decoding="async" />
          <span className="sg-mesh" aria-hidden />
          <div className="sg-tiles" aria-hidden>
            {TILES.map((t) => (
              <span
                key={t.i}
                className="sg-tile"
                style={{ transitionDelay: phase === "done" && !reduced.current ? `${t.delay}s` : "0s" }}
              />
            ))}
          </div>
          <span className="sg-status">
            <span className="sg-status-dot" />
            {phase === "done" ? "Ready to post" : "Generating"}
            {phase !== "done" ? <span className="sg-ell" /> : null}
          </span>
        </div>

        <div className="sg-chips" role="tablist" aria-label="Try a business">
          {SHOTS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              aria-selected={i === idx % SHOTS.length}
              className={`sg-chip${i === idx % SHOTS.length ? " is-on" : ""}`}
              onClick={() => setIdx(i)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sg-strip" data-reveal>
        <span className="sg-strip-label">— and a thousand more, for every kind of business —</span>
        <div className="sg-strip-row">
          {MORE.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" decoding="async" className="sg-strip-img" />
          ))}
        </div>
      </div>

      <style>{`
        .pb-marketing-site .studio-gen {
          --pb-red: #ee2532;
          background: #e8ddc9;
          padding: clamp(72px, 12vh, 140px) var(--px);
        }
        .pb-marketing-site .sg-intro {
          max-width: 640px; margin: 0 auto clamp(40px, 6vh, 64px); text-align: center;
        }
        .pb-marketing-site .sg-kicker { color: var(--pb-red); }
        .pb-marketing-site .sg-title {
          margin: 0.55em 0 0; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; letter-spacing: -0.025em;
        }
        .pb-marketing-site .sg-lede {
          margin: 1.1em auto 0; max-width: 54ch; font-size: clamp(15px, 1.1vw, 18px); line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 64%, transparent);
        }

        /* ---- The generator ---- */
        .pb-marketing-site .sg-stage {
          max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;
        }
        .pb-marketing-site .sg-bar {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(20,20,30,0.08); border-radius: 14px;
          padding: 12px 12px 12px 16px; box-shadow: 0 16px 40px -30px rgba(20,20,40,0.5);
        }
        .pb-marketing-site .sg-bar-spark { flex: none; color: var(--pb-red); display: inline-flex; }
        .pb-marketing-site .sg-bar-text { flex: 1; font-size: 14px; line-height: 1.4; color: var(--ink); min-height: 20px; }
        .pb-marketing-site .sg-caret {
          display: inline-block; width: 2px; height: 1em; margin-left: 1px; vertical-align: -2px;
          background: var(--pb-red); animation: sgCaret 0.9s steps(1) infinite;
        }
        .pb-marketing-site .sg-bar-btn {
          flex: none; font-size: 12px; font-weight: 700; letter-spacing: 0.01em; color: #fff;
          background: var(--pb-red); padding: 7px 14px; border-radius: 10px; transition: background 0.3s, opacity 0.3s;
        }
        .pb-marketing-site .sg-bar-btn--generating { opacity: 0.65; }
        .pb-marketing-site .sg-bar-btn--done { background: #1f9d4d; }

        .pb-marketing-site .sg-canvas {
          position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden;
          border-radius: 20px; background: #15121a;
          box-shadow: 0 48px 110px -46px rgba(20,20,40,0.62), inset 0 0 0 1px rgba(255,255,255,0.06);
          transition: box-shadow 0.6s ease;
        }
        .pb-marketing-site .sg-generating {
          box-shadow: 0 0 0 1px rgba(238,37,50,0.4), 0 0 64px -6px rgba(238,37,50,0.45),
                      0 48px 110px -46px rgba(20,20,40,0.62);
        }
        .pb-marketing-site .sg-canvas img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center 28%;
          transition: filter 1.2s ease, transform 1.4s cubic-bezier(.2,.8,.2,1);
        }
        .pb-marketing-site .sg-typing img,
        .pb-marketing-site .sg-generating img { filter: blur(10px) saturate(1.15); transform: scale(1.05); }
        .pb-marketing-site .sg-done img { filter: blur(0) saturate(1); transform: scale(1); }

        /* tile dissolve — the canvas "computes", then pixels denoise in (scattered) */
        .pb-marketing-site .sg-tiles {
          position: absolute; inset: 0; z-index: 1; display: grid;
          grid-template-columns: repeat(${TILE_COLS}, 1fr);
          grid-template-rows: repeat(${TILE_ROWS}, 1fr);
        }
        .pb-marketing-site .sg-tile { background: #15121a; opacity: 1; transition: opacity 0.75s ease; }
        .pb-marketing-site .sg-done .sg-tile { opacity: 0; }

        /* soft animated gradient mesh while generating — diffusion "thinking", no hard line */
        .pb-marketing-site .sg-mesh {
          position: absolute; inset: -22%; z-index: 2; opacity: 0; pointer-events: none;
          mix-blend-mode: screen; filter: blur(28px);
          background:
            radial-gradient(38% 42% at 28% 32%, rgba(238,37,50,0.55), transparent 70%),
            radial-gradient(42% 46% at 72% 58%, rgba(255,150,70,0.45), transparent 72%),
            radial-gradient(46% 50% at 52% 82%, rgba(238,60,110,0.42), transparent 72%),
            radial-gradient(40% 44% at 64% 20%, rgba(255,110,60,0.38), transparent 72%);
          background-repeat: no-repeat;
          background-size: 130% 130%, 150% 150%, 140% 140%, 120% 120%;
          transition: opacity 0.6s ease;
        }
        .pb-marketing-site .sg-typing .sg-mesh { opacity: 0.45; animation: sgMesh 4.2s ease-in-out infinite alternate; }
        .pb-marketing-site .sg-generating .sg-mesh { opacity: 1; animation: sgMesh 4.2s ease-in-out infinite alternate; }

        .pb-marketing-site .sg-status {
          position: absolute; left: 12px; bottom: 12px; z-index: 3;
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 11px; border-radius: 99px;
          background: rgba(10,8,12,0.55); backdrop-filter: blur(8px);
          font-size: 11px; font-weight: 600; letter-spacing: 0.02em; color: #fff;
        }
        .pb-marketing-site .sg-status-dot { width: 6px; height: 6px; border-radius: 99px; background: var(--pb-red); }
        .pb-marketing-site .sg-generating .sg-status-dot,
        .pb-marketing-site .sg-typing .sg-status-dot { animation: sgPulse 1s ease-in-out infinite; }
        .pb-marketing-site .sg-done .sg-status-dot { background: #43d17a; }
        .pb-marketing-site .sg-ell::after { content: ""; animation: sgEll 1.2s steps(4) infinite; }

        .pb-marketing-site .sg-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .pb-marketing-site .sg-chip {
          appearance: none; cursor: pointer; font: inherit;
          padding: 7px 14px; border-radius: 99px; font-size: 13px; font-weight: 500;
          border: 1px solid rgba(20,20,30,0.12); background: rgba(255,255,255,0.45);
          color: color-mix(in srgb, var(--ink) 66%, transparent); transition: all 0.2s;
        }
        .pb-marketing-site .sg-chip:hover { border-color: rgba(20,20,30,0.28); color: var(--ink); }
        .pb-marketing-site .sg-chip.is-on { background: var(--pb-red); border-color: var(--pb-red); color: #fff; }

        /* ---- range strip ---- */
        .pb-marketing-site .sg-strip { margin: clamp(40px, 6vh, 72px) auto 0; max-width: 940px; text-align: center; }
        .pb-marketing-site .sg-strip-label {
          display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 42%, transparent); margin-bottom: 22px;
        }
        .pb-marketing-site .sg-strip-row {
          display: flex; gap: clamp(10px, 1.4vw, 18px); justify-content: center; align-items: flex-start;
        }
        .pb-marketing-site .sg-strip-img {
          width: clamp(72px, 13vw, 140px); height: auto; flex: none; mix-blend-mode: multiply;
        }
        @media (max-width: 640px) { .pb-marketing-site .sg-strip-row { flex-wrap: wrap; } }

        @keyframes sgCaret { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes sgMesh {
          0%   { background-position: 0% 0%,    100% 40%, 40% 100%, 70% 0%; }
          50%  { background-position: 45% 35%,  55% 70%,  60% 55%,  30% 45%; }
          100% { background-position: 100% 100%, 0% 50%,  50% 0%,   100% 80%; }
        }
        @keyframes sgPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes sgEll { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} }
        @media (prefers-reduced-motion: reduce) {
          .pb-marketing-site .sg-tile, .pb-marketing-site .sg-canvas img { transition: none; }
          .pb-marketing-site .sg-mesh, .pb-marketing-site .sg-caret,
          .pb-marketing-site .sg-status-dot, .pb-marketing-site .sg-ell::after { animation: none; }
        }
      `}</style>
    </section>
  );
}
