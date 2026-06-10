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

type Phase = "typing" | "generating" | "done";

/**
 * The Posterboy studio — AI image generator. A prompt types in, the canvas
 * "renders" (blur-up + brand-red scan), then resolves. Cycles business types;
 * the chips also let you jump. Self-contained + reduced-motion safe.
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
    at(() => setPhase("generating"), typedDone + 380);
    at(() => setPhase("done"), typedDone + 380 + 1700);
    at(() => setIdx((i) => (i + 1) % SHOTS.length), typedDone + 380 + 1700 + 3400);

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
        </div>

        <div className={`sg-canvas sg-${phase}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.src} alt={`Studio render — ${shot.label}`} loading="lazy" decoding="async" />
          <span className="sg-scan" aria-hidden />
          <span className="sg-grain" aria-hidden />
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
          max-width: 440px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px;
        }
        .pb-marketing-site .sg-bar {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(20,20,30,0.08); border-radius: 14px;
          padding: 13px 16px; box-shadow: 0 16px 40px -30px rgba(20,20,40,0.5);
        }
        .pb-marketing-site .sg-bar-spark { flex: none; color: var(--pb-red); display: inline-flex; }
        .pb-marketing-site .sg-bar-text { font-size: 14px; line-height: 1.4; color: var(--ink); min-height: 20px; }
        .pb-marketing-site .sg-caret {
          display: inline-block; width: 2px; height: 1em; margin-left: 1px; vertical-align: -2px;
          background: var(--pb-red); animation: sgCaret 0.9s steps(1) infinite;
        }

        .pb-marketing-site .sg-canvas {
          position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden;
          border-radius: 18px; background: #161318;
          box-shadow: 0 40px 90px -44px rgba(20,20,40,0.6), inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .pb-marketing-site .sg-canvas img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center 28%;
          transition: filter 0.8s ease, opacity 0.8s ease, transform 0.9s cubic-bezier(.22,1,.36,1);
        }
        .pb-marketing-site .sg-typing img { opacity: 0; filter: blur(24px); transform: scale(1.12); }
        .pb-marketing-site .sg-generating img { opacity: 0.62; filter: blur(15px) saturate(1.25); transform: scale(1.06); }
        .pb-marketing-site .sg-done img { opacity: 1; filter: blur(0) saturate(1); transform: scale(1); }

        /* brand-red scan sweep while generating */
        .pb-marketing-site .sg-scan {
          position: absolute; inset: 0; opacity: 0; pointer-events: none;
          background: linear-gradient(180deg,
            transparent 0%, rgba(238,37,50,0) 44%, rgba(238,37,50,0.55) 50%,
            rgba(238,37,50,0) 56%, transparent 100%);
          background-size: 100% 220%;
        }
        .pb-marketing-site .sg-generating .sg-scan { opacity: 1; animation: sgScan 1.7s linear; }

        .pb-marketing-site .sg-grain {
          position: absolute; inset: 0; opacity: 0; pointer-events: none; mix-blend-mode: overlay;
          background-image: radial-gradient(rgba(255,255,255,0.5) 0.5px, transparent 0.6px);
          background-size: 3px 3px;
        }
        .pb-marketing-site .sg-typing .sg-grain,
        .pb-marketing-site .sg-generating .sg-grain { opacity: 0.5; }

        .pb-marketing-site .sg-status {
          position: absolute; left: 12px; bottom: 12px; z-index: 2;
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 11px; border-radius: 99px;
          background: rgba(10,8,12,0.55); backdrop-filter: blur(8px);
          font-size: 11px; font-weight: 600; letter-spacing: 0.02em; color: #fff;
        }
        .pb-marketing-site .sg-status-dot {
          width: 6px; height: 6px; border-radius: 99px; background: var(--pb-red);
        }
        .pb-marketing-site .sg-generating .sg-status-dot,
        .pb-marketing-site .sg-typing .sg-status-dot { animation: sgPulse 1s ease-in-out infinite; }
        .pb-marketing-site .sg-done .sg-status-dot { background: #43d17a; }
        .pb-marketing-site .sg-ell::after { content: "…"; animation: sgEll 1.2s steps(4) infinite; }

        .pb-marketing-site .sg-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .pb-marketing-site .sg-chip {
          appearance: none; cursor: pointer; font: inherit;
          padding: 7px 14px; border-radius: 99px; font-size: 13px; font-weight: 500;
          border: 1px solid rgba(20,20,30,0.12); background: rgba(255,255,255,0.45);
          color: color-mix(in srgb, var(--ink) 66%, transparent); transition: all 0.2s;
        }
        .pb-marketing-site .sg-chip:hover { border-color: rgba(20,20,30,0.28); color: var(--ink); }
        .pb-marketing-site .sg-chip.is-on {
          background: var(--pb-red); border-color: var(--pb-red); color: #fff;
        }

        @keyframes sgCaret { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes sgScan { from { background-position: 0 -60%; } to { background-position: 0 160%; } }
        @keyframes sgPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes sgEll { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} }
        @media (prefers-reduced-motion: reduce) {
          .pb-marketing-site .sg-canvas img { transition: none; }
          .pb-marketing-site .sg-scan, .pb-marketing-site .sg-caret,
          .pb-marketing-site .sg-status-dot, .pb-marketing-site .sg-ell::after { animation: none; }
        }
      `}</style>
    </section>
  );
}
