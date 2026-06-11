"use client";

/**
 * THROWAWAY CONCEPT GALLERY — studio idle-state explorations.
 * Six treatments for the empty canvas (replacing the plain glowing white box).
 * Pure CSS animation, reduced-motion safe. Not linked anywhere; delete freely.
 */

// Deterministic particle layout (no Math.random → no hydration mismatch).
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61) % 92 + 4,
  delay: (i * 1.7) % 12,
  dur: 11 + (i % 5) * 2.4,
  size: 2 + (i % 3),
  drift: i % 2 === 0 ? 10 : -12,
}));

export default function StudioIdleConcepts() {
  return (
    <div className="ic-root">
      <header className="ic-head">
        <h1>Studio idle — six ways the empty canvas could feel</h1>
        <p>
          The current state is a plain glowing sheet. Each tile below is a live
          alternative. All warm-light, all calm, all reduced-motion safe.
        </p>
      </header>

      <div className="ic-grid">
        {/* 1 — MORNING LIGHT */}
        <section className="ic-tile">
          <div className="ic-canvas">
            <div className="ic-paper p-light">
              <span className="light-sweep" />
            </div>
          </div>
          <h2>01 — Morning light</h2>
          <p>
            A slow band of warm sunlight drifts across the sheet, like light
            moving through a window. The paper feels lit, not backlit.
          </p>
        </section>

        {/* 2 — FRESH SHEET */}
        <section className="ic-tile">
          <div className="ic-canvas">
            <div className="ic-paper p-breathe">
              <svg className="grain" aria-hidden>
                <filter id="icNoise">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
                </filter>
                <rect width="100%" height="100%" filter="url(#icNoise)" />
              </svg>
              <span className="corner-fold" />
            </div>
          </div>
          <h2>02 — Fresh sheet</h2>
          <p>
            Paper grain + a barely-perceptible breathing glow + a folded red
            corner tab. Tactile — a real blank page waiting for ink.
          </p>
        </section>

        {/* 3 — ARTBOARD */}
        <section className="ic-tile">
          <div className="ic-canvas">
            <div className="ic-paper p-artboard">
              <span className="thirds v1" /><span className="thirds v2" />
              <span className="thirds h1" /><span className="thirds h2" />
              <svg className="draw-border" viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden>
                <rect x="1.5" y="1.5" width="97" height="122" rx="3" pathLength="100" />
              </svg>
              <span className="crop tl" /><span className="crop tr" />
              <span className="crop bl" /><span className="crop br" />
            </div>
          </div>
          <h2>03 — Artboard</h2>
          <p>
            Rule-of-thirds hairlines, crop marks, and a dashed outline that
            slowly draws itself. Says &ldquo;this is your workspace&rdquo; — designerly,
            functional.
          </p>
        </section>

        {/* 4 — STUDIO DUST */}
        <section className="ic-tile">
          <div className="ic-canvas">
            <div className="ic-paper p-dust">
              {MOTES.map((m, i) => (
                <span
                  key={i}
                  className="mote"
                  style={{
                    left: `${m.left}%`,
                    width: m.size,
                    height: m.size,
                    animationDelay: `${m.delay}s`,
                    animationDuration: `${m.dur}s`,
                    ["--drift" as string]: `${m.drift}px`,
                  }}
                />
              ))}
            </div>
          </div>
          <h2>04 — Studio dust</h2>
          <p>
            Tiny warm motes drift up through the light, like dust in a sunlit
            studio. Quietly alive — and they can coalesce into the image when
            generation starts.
          </p>
        </section>

        {/* 5 — WARM MESH */}
        <section className="ic-tile">
          <div className="ic-canvas">
            <div className="ic-paper p-mesh">
              <span className="blob b1" />
              <span className="blob b2" />
              <span className="blob b3" />
            </div>
          </div>
          <h2>05 — Warm mesh</h2>
          <p>
            Faint peach / rose / cream blobs drifting under the surface — the
            same diffusion language as the marketing site&rsquo;s generator. The
            canvas feels latent, like an image is already forming.
          </p>
        </section>

        {/* 6 — ECHOES */}
        <section className="ic-tile">
          <div className="ic-canvas">
            <div className="ic-paper p-echo">
              <div className="ghost g1">
                <span className="g-img" />
                <span className="g-line w70" />
                <span className="g-line w45" />
              </div>
              <div className="ghost g2">
                <span className="g-img tall" />
                <span className="g-line w60" />
              </div>
            </div>
          </div>
          <h2>06 — Echoes</h2>
          <p>
            Ghost-faint post layouts fade in and out — a whisper of what&rsquo;s
            about to exist here. Suggestive without being busy.
          </p>
        </section>
      </div>

      <style>{`
        .ic-root {
          min-height: 100vh; background: #eef0f2; color: #1c1c1e;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif;
          padding: 48px clamp(20px, 5vw, 72px) 96px;
        }
        .ic-head h1 { font-size: clamp(22px, 3vw, 30px); font-weight: 700; letter-spacing: -0.02em; }
        .ic-head p { margin-top: 8px; max-width: 560px; font-size: 14px; line-height: 1.55; color: #76767e; }
        .ic-grid {
          margin-top: 36px; display: grid; gap: 28px;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        }
        .ic-tile h2 { margin-top: 14px; font-size: 14px; font-weight: 700; letter-spacing: 0.01em; }
        .ic-tile > p { margin-top: 5px; font-size: 12.5px; line-height: 1.55; color: #6e6e76; }
        .ic-canvas {
          position: relative; aspect-ratio: 4/3.1; border-radius: 18px; overflow: hidden;
          background: radial-gradient(130% 130% at 50% 28%, #b8b2aa 0%, #948e86 58%, #7e7871 100%);
          display: grid; place-items: center;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.18), 0 12px 30px rgba(0,0,0,0.10);
        }
        .ic-paper {
          position: relative; width: 46%; aspect-ratio: 4/5; border-radius: 8px;
          background: #f4f3f1; overflow: hidden;
          box-shadow: 0 0 34px rgba(255,255,255,0.45), 0 8px 24px rgba(0,0,0,0.16);
        }

        /* 01 morning light */
        .p-light { background: linear-gradient(180deg, #f6f4f1, #f0eeea); }
        .light-sweep {
          position: absolute; inset: -20%;
          background: linear-gradient(105deg, transparent 32%, rgba(255,214,170,0.55) 47%, rgba(255,236,214,0.75) 52%, rgba(255,214,170,0.5) 57%, transparent 72%);
          filter: blur(6px); animation: icSweep 9s ease-in-out infinite alternate;
        }
        @keyframes icSweep { from { transform: translateX(-28%); } to { transform: translateX(28%); } }

        /* 02 fresh sheet */
        .p-breathe { animation: icBreathe 6.5s ease-in-out infinite; }
        @keyframes icBreathe {
          0%, 100% { box-shadow: 0 0 26px rgba(255,255,255,0.35), 0 8px 24px rgba(0,0,0,0.16); }
          50% { box-shadow: 0 0 44px rgba(255,242,222,0.65), 0 8px 24px rgba(0,0,0,0.16); }
        }
        .grain { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.05; }
        .corner-fold {
          position: absolute; top: 0; right: 0; width: 0; height: 0;
          border-top: 16px solid #ee2532; border-left: 16px solid transparent;
          filter: drop-shadow(-1px 1px 1px rgba(0,0,0,0.12));
          animation: icFold 6.5s ease-in-out infinite;
        }
        @keyframes icFold { 0%,100% { border-top-width: 15px; border-left-width: 15px; } 50% { border-top-width: 18px; border-left-width: 18px; } }

        /* 03 artboard */
        .thirds { position: absolute; background: rgba(28,28,30,0.07); }
        .thirds.v1 { left: 33.3%; top: 0; bottom: 0; width: 1px; }
        .thirds.v2 { left: 66.6%; top: 0; bottom: 0; width: 1px; }
        .thirds.h1 { top: 33.3%; left: 0; right: 0; height: 1px; }
        .thirds.h2 { top: 66.6%; left: 0; right: 0; height: 1px; }
        .draw-border { position: absolute; inset: 0; width: 100%; height: 100%; }
        .draw-border rect {
          fill: none; stroke: rgba(238,37,50,0.55); stroke-width: 1;
          stroke-dasharray: 6 5; stroke-dashoffset: 0;
          animation: icDraw 14s linear infinite;
          vector-effect: non-scaling-stroke;
        }
        @keyframes icDraw { to { stroke-dashoffset: -100; } }
        .crop { position: absolute; width: 10px; height: 10px; border-color: rgba(28,28,30,0.35); border-style: solid; border-width: 0; }
        .crop.tl { top: -1px; left: -1px; border-top-width: 1.5px; border-left-width: 1.5px; }
        .crop.tr { top: -1px; right: -1px; border-top-width: 1.5px; border-right-width: 1.5px; }
        .crop.bl { bottom: -1px; left: -1px; border-bottom-width: 1.5px; border-left-width: 1.5px; }
        .crop.br { bottom: -1px; right: -1px; border-bottom-width: 1.5px; border-right-width: 1.5px; }

        /* 04 studio dust */
        .p-dust { background: linear-gradient(180deg, #f5f3f0, #eeebe6); }
        .mote {
          position: absolute; bottom: -4px; border-radius: 50%;
          background: rgba(255,226,188,0.9); box-shadow: 0 0 6px rgba(255,214,170,0.8);
          animation-name: icRise; animation-timing-function: linear; animation-iteration-count: infinite;
          opacity: 0;
        }
        @keyframes icRise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          12% { opacity: 0.9; }
          85% { opacity: 0.5; }
          100% { transform: translateY(-340px) translateX(var(--drift)); opacity: 0; }
        }

        /* 05 warm mesh */
        .p-mesh { background: #f5f2ee; }
        .blob { position: absolute; border-radius: 50%; filter: blur(26px); opacity: 0.55; }
        .b1 { width: 70%; height: 55%; background: #ffd9b8; top: -10%; left: -16%; animation: icB1 13s ease-in-out infinite alternate; }
        .b2 { width: 64%; height: 52%; background: #ffc2c8; bottom: -12%; right: -14%; animation: icB2 16s ease-in-out infinite alternate; }
        .b3 { width: 52%; height: 44%; background: #fff1da; top: 36%; left: 26%; animation: icB3 11s ease-in-out infinite alternate; }
        @keyframes icB1 { to { transform: translate(26%, 18%) scale(1.12); } }
        @keyframes icB2 { to { transform: translate(-20%, -16%) scale(0.92); } }
        @keyframes icB3 { to { transform: translate(-14%, 12%) scale(1.18); } }

        /* 06 echoes */
        .p-echo { background: linear-gradient(180deg, #f6f4f1, #f0eeea); }
        .ghost { position: absolute; inset: 12% 14%; opacity: 0; animation: icGhost 12s ease-in-out infinite; }
        .g2 { animation-delay: 6s; }
        .g-img { display: block; width: 100%; height: 58%; border-radius: 6px; background: rgba(28,28,30,0.07); }
        .g-img.tall { height: 68%; }
        .g-line { display: block; height: 7px; border-radius: 4px; background: rgba(28,28,30,0.08); margin-top: 9px; }
        .w70 { width: 70%; } .w60 { width: 60%; } .w45 { width: 45%; }
        @keyframes icGhost {
          0%, 46%, 100% { opacity: 0; transform: translateY(6px); }
          12%, 34% { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .light-sweep, .p-breathe, .corner-fold, .draw-border rect, .mote, .blob, .ghost {
            animation: none;
          }
          .ghost.g1 { opacity: 0.9; }
          .mote { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
