"use client";

/** Scoped studio layout CSS — extracted from PosterboyStudio. */
export function StudioStyles() {
  return (
    <style>{`
.pb-studio {
    --bg: #ececee;
    --card: #ffffff;
    --ink: #0d0d10;
    --ink-2: #2a2a2e;
    --muted: #6b6b73;
    --muted-2: #9a9aa3;
    --line: #ececef;
    --line-2: #e3e3e7;
    --red: #ee2532;
    --red-press: #c81e2a;
    --red-soft: #fff1f2;
    --green: #157a38;
    --shadow-sm: 0 1px 2px rgba(15, 15, 20, 0.04), 0 1px 1px rgba(15, 15, 20, 0.02);
    --shadow-md: 0 4px 18px rgba(15, 15, 20, 0.06), 0 1px 2px rgba(15, 15, 20, 0.04);
    --radius: 20px;
    --radius-sm: 12px;
    --serif: "Fraunces", "Times New Roman", serif;
    --sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  }.pb-studio * { box-sizing: border-box; margin: 0; padding: 0; }.pb-studio {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-body);
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    height: 100%;
  }.pb-studio button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }.pb-studio button:disabled { cursor: not-allowed; opacity: 0.45; }.pb-studio input { font-family: inherit; }.pb-studio input:disabled { opacity: 0.6; }.pb-studio .app {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-areas: "sidebar canvas";
    gap: 18px;
    padding: 18px;
    min-height: 100%;
    height: 100%;
    max-width: 1700px;
    margin: 0 auto;
    align-items: stretch;
  }.pb-studio .studio-error {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: min(420px, 90%);
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid rgba(238, 37, 50, 0.25);
    background: rgba(255, 255, 255, 0.92);
    color: #b91c1c;
    font-size: var(--text-body-sm);
    text-align: center;
    box-shadow: 0 8px 24px rgba(15, 15, 20, 0.12);
  }.pb-studio .studio-error button {
    margin-top: 8px;
    font-size: var(--text-caption);
    font-weight: 500;
    color: var(--red-press);
  }.pb-studio .sidebar { grid-area: sidebar; min-width: 0; }.pb-studio .canvas { grid-area: canvas;  min-width: 0; }.pb-studio /* ============ CANVAS ============ */
  .canvas {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    min-height: 760px;
    /* Concrete studio gradient — warm cool gray fall */
    background:
      radial-gradient(ellipse 65% 45% at 50% 48%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, transparent 65%),
      linear-gradient(180deg,
        #c4bdb6 0%,
        #b3aca5 20%,
        #a09993 45%,
        #8d8780 65%,
        #79736d 85%,
        #6a655f 100%
      );
    box-shadow: var(--shadow-md);
  }.pb-studio /* Side wall shadows for depth */
  .canvas::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 18%),
      linear-gradient(270deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 18%);
    pointer-events: none;
    z-index: 1;
  }.pb-studio /* Concrete noise texture */
  .canvas::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.18;
    mix-blend-mode: multiply;
    pointer-events: none;
    z-index: 2;
  }.pb-studio /* Tile-like horizontal lines on the wall */
  .canvas-wall-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to bottom, transparent 32%, rgba(0,0,0,0.05) 32.5%, transparent 33%),
      linear-gradient(to right, transparent 33%, rgba(0,0,0,0.04) 33.3%, transparent 33.6%, transparent 66%, rgba(0,0,0,0.04) 66.3%, transparent 66.6%);
    pointer-events: none;
    z-index: 2;
    opacity: 0.6;
  }.pb-studio /* Floor with subtle reflection */
  .canvas-floor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28%;
    background:
      linear-gradient(180deg,
        transparent 0%,
        rgba(50,45,40,0.08) 30%,
        rgba(50,45,40,0.22) 80%,
        rgba(40,35,30,0.32) 100%
      );
    pointer-events: none;
    z-index: 3;
  }.pb-studio /* Floor tile seams */
  .canvas-floor::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, transparent 49.5%, rgba(0,0,0,0.06) 50%, transparent 50.5%);
    transform: perspective(800px) rotateX(60deg);
    transform-origin: center bottom;
    opacity: 0.7;
  }.pb-studio /* Canvas top toolbar */
  .canvas-top {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 20;
  }.pb-studio .dim-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: var(--text-body);
    font-weight: 500;
    color: var(--ink);
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }.pb-studio .dim-chip svg { width: 15px; height: 15px; color: var(--ink-2); }.pb-studio .dim-chip--static { cursor: default; }.pb-studio .dim-chip .post-label { font-weight: 600; }.pb-studio .dim-chip .post-meta { color: var(--muted); font-weight: 500; font-variant-numeric: tabular-nums; }.pb-studio .dim-chip .chev { color: var(--muted); transition: var(--transition-lift); }.pb-studio .dim-chip.open .chev { transform: rotate(180deg); }.pb-studio .post-select { position: relative; }.pb-studio .post-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    min-width: 220px;
    list-style: none;
    margin: 0;
    padding: 6px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 14px;
    box-shadow: 0 10px 34px rgba(0,0,0,0.18);
    z-index: 30;
    animation: pbsMenuIn 0.16s ease;
  }@keyframes pbsMenuIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }.pb-studio .post-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    font-size: var(--text-body);
    color: var(--ink);
    transition: var(--transition-color);
  }.pb-studio .post-option:hover { background: rgba(0,0,0,0.05); }.pb-studio .post-option.active { background: rgba(0,0,0,0.06); font-weight: 600; }.pb-studio .post-option .po-dim { color: var(--muted); font-size: var(--text-caption); font-variant-numeric: tabular-nums; }.pb-studio .top-toggles {
    display: flex;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 12px;
    padding: 4px;
    gap: 2px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }.pb-studio .top-toggles button {
    width: 36px; height: 30px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--ink-2);
    transition: var(--transition-color);
  }.pb-studio .top-toggles button.active { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }.pb-studio .top-toggles button:not(.active):hover { background: rgba(255,255,255,0.5); }.pb-studio .top-toggles button svg { width: 16px; height: 16px; }.pb-studio .preview-toggle {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 12px;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    font-size: var(--text-body-sm); font-weight: 600; color: var(--ink);
    cursor: pointer; transition: var(--transition-interactive);
  }.pb-studio .preview-toggle:hover { background: #fff; transform: translateY(-1px); }.pb-studio .preview-toggle svg { width: 15px; height: 15px; }.pb-studio .preview-toggle[aria-pressed="true"] { background: var(--red-press, #c81e2a); color: #fff; border-color: transparent; box-shadow: 0 6px 18px -6px rgba(200,30,42,0.55); }.pb-studio /* Minimal control rail — left of the image */
  .tool-rail {
    position: absolute;
    left: 26px;
    top: 50%;
    transform: translateY(-54%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    z-index: 18;
  }.pb-studio .tool-rail .rail-item { position: relative; display: flex; }.pb-studio .tool-rail .rail-ico {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: var(--ink-2);
    background: transparent;
    transition: var(--transition-interactive);
  }.pb-studio .tool-rail .rail-ico:hover { color: var(--ink-2); }.pb-studio .tool-rail .rail-ico:hover svg { filter: drop-shadow(0 0 4px rgba(255,255,255,0.6)); }.pb-studio .tool-rail .rail-ico.active, .pb-studio .tool-rail .rail-ico.open {
    background: transparent;
    color: #fff;
  }.pb-studio .tool-rail .rail-ico.active svg, .pb-studio .tool-rail .rail-ico.open svg {
    filter: drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 0 11px rgba(255,255,255,0.7)) drop-shadow(0 0 1px rgba(0,0,0,0.35));
  }.pb-studio .tool-rail .rail-ico svg { width: 19px; height: 19px; transition: filter var(--duration-standard) var(--ease-standard); }.pb-studio .tool-rail .rail-ico-label {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    white-space: nowrap;
    font-size: var(--text-caption);
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #fff;
    text-shadow: 0 0 5px rgba(255,255,255,0.95), 0 0 11px rgba(255,255,255,0.65), 0 0 2px rgba(0,0,0,0.5);
    pointer-events: none;
    z-index: 19;
    animation: pbsLabelIn 0.22s ease;
  }.pb-studio .tool-rail .rail-ico.preview-only svg { opacity: 0.5; }
  .pb-studio .tool-rail .rail-soon {
    display: block; margin-top: 1px; font-size: var(--text-eyebrow); font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase; color: #c81e2a;
    text-shadow: 0 0 4px rgba(255,255,255,0.9);
  }@keyframes pbsLabelIn {
    from { opacity: 0; transform: translateY(-50%) translateX(-5px); }
    to { opacity: 1; transform: translateY(-50%) translateX(0); }
  }.pb-studio .tool-rail .rail-ico:disabled { opacity: 0.35; }.pb-studio .tool-rail .rail-div {
    width: 20px;
    height: 1px;
    background: rgba(15,15,20,0.12);
    margin: 7px 0;
  }.pb-studio .tool-rail .rail-publish:not(:disabled) {
    color: #fff;
    background: var(--ink);
  }.pb-studio .tool-rail .rail-publish:not(:disabled):hover { transform: translateY(-1px); background: #000; }.pb-studio .tool-rail .rail-publish.published:not(:disabled) { background: var(--green); }.pb-studio .edit-rail { left: auto; right: 26px; }.pb-studio .tool-rail .rail-confirm:not(:disabled) { color: #fff; background: var(--green); }.pb-studio .tool-rail .rail-confirm:not(:disabled):hover { transform: translateY(-1px); background: #15924f; }.pb-studio .tool-rail.edit-rail .rail-pop { left: auto; right: calc(100% + 12px); }.pb-studio .edit-pop { padding: 12px; min-width: 190px; }.pb-studio .edit-pop .edit-row { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-caption); color: var(--ink); font-weight: 500; padding: 0 2px; }.pb-studio .edit-pop .edit-row:not(:first-child) { margin-top: 9px; }.pb-studio .edit-pop .edit-val { color: var(--muted); font-variant-numeric: tabular-nums; }.pb-studio .edit-pop input[type="range"] { width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: var(--line-2); border-radius: 4px; margin: 5px 0 2px; cursor: pointer; }.pb-studio .edit-pop input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--ink); cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }.pb-studio .edit-pop input[type="range"]::-moz-range-thumb { width: 15px; height: 15px; border: none; border-radius: 50%; background: var(--ink); cursor: pointer; }.pb-studio .edit-pop .edit-reset { display: block; margin-top: 12px; width: 100%; padding: 8px; border-radius: 8px; font-size: var(--text-caption); font-weight: 600; text-align: center; color: var(--muted); background: rgba(0,0,0,0.05); }.pb-studio .edit-pop .edit-reset:hover { background: rgba(0,0,0,0.09); color: var(--ink); }.pb-studio .tool-rail .rail-pop {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    min-width: 188px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.55);
    border-radius: 14px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.18);
    z-index: 20;
    animation: pbsPopIn 0.16s ease;
  }@keyframes pbsPopIn {
    from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
    to { opacity: 1; transform: translateY(-50%) translateX(0); }
  }.pb-studio .tool-rail .rail-pop button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    font-size: var(--text-body);
    color: var(--ink);
    transition: var(--transition-color);
  }.pb-studio .tool-rail .rail-pop button svg { width: 15px; height: 15px; color: var(--muted); }.pb-studio .tool-rail .rail-pop button:hover { background: rgba(0,0,0,0.05); }.pb-studio .tool-rail .rail-pop button.active { background: rgba(0,0,0,0.06); font-weight: 600; }.pb-studio .tool-rail .rail-pop button.active svg { color: var(--red); }.pb-studio .tool-rail .rail-pop .pro-tag {
    margin-left: auto;
    font-size: var(--text-eyebrow);
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--muted-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    padding: 1px 5px;
  }.pb-studio /* The glowing magic frame */
  .frame-wrap {
    position: absolute;
    top: calc((100% - 210px) / 2);
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    display: grid;
    place-items: center;
    transition: width 0.5s cubic-bezier(0.65, 0, 0.35, 1), height 0.5s cubic-bezier(0.65, 0, 0.35, 1);
  }.pb-studio /* Glow spill behind the frame */
  .frame-wrap::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: radial-gradient(circle at center,
      rgba(255,255,255,0.55) 0%,
      rgba(255,255,255,0.28) 18%,
      rgba(255,255,255,0.12) 35%,
      rgba(255,255,255,0.05) 55%,
      transparent 75%
    );
    filter: blur(6px);
    pointer-events: none;
    animation: pbsGlow 5s ease-in-out infinite;
  }.pb-studio .frame {
    position: relative;
    width: 100%;
    height: 100%;
    transition: width 0.55s cubic-bezier(0.65, 0, 0.35, 1), height 0.55s cubic-bezier(0.65, 0, 0.35, 1);
    background: linear-gradient(180deg, #fbfbfb 0%, #efefef 100%);
    border-radius: 4px;
    border: 1.5px solid rgba(255,255,255,1);
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,1),
      inset 0 0 40px rgba(255,255,255,0.95),
      0 0 1px 1px rgba(255,255,255,0.85),
      0 0 30px 4px rgba(255,255,255,0.55),
      0 0 60px 12px rgba(255,255,255,0.35),
      0 0 120px 30px rgba(255,255,255,0.18),
      0 18px 50px rgba(0,0,0,0.25);
    overflow: hidden;
    animation: pbsFrame 5s ease-in-out infinite;
  }@keyframes pbsGlow {
    0%, 100% { opacity: 0.85; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
  }@keyframes pbsFrame {
    0%, 100% {
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,1),
        inset 0 0 40px rgba(255,255,255,0.95),
        0 0 1px 1px rgba(255,255,255,0.85),
        0 0 30px 4px rgba(255,255,255,0.55),
        0 0 60px 12px rgba(255,255,255,0.35),
        0 0 120px 30px rgba(255,255,255,0.18),
        0 18px 50px rgba(0,0,0,0.25);
    }
    50% {
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,1),
        inset 0 0 50px rgba(255,255,255,1),
        0 0 1px 1px rgba(255,255,255,0.95),
        0 0 40px 6px rgba(255,255,255,0.65),
        0 0 80px 18px rgba(255,255,255,0.42),
        0 0 160px 40px rgba(255,255,255,0.22),
        0 18px 50px rgba(0,0,0,0.28);
    }
  }.pb-studio /* Generating state */
  .frame.generating {
    background: linear-gradient(180deg, #edeae5 0%, #e0ddd6 100%);
  }.pb-studio .frame.generating::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg,
      rgba(255,255,255,0) 32%,
      rgba(255,255,255,0.78) 50%,
      rgba(255,255,255,0) 68%
    );
    background-size: 250% 100%;
    animation: pbsSweepA 2.6s ease-in-out infinite;
    z-index: 2;
  }.pb-studio .frame.generating::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(255deg,
      rgba(217,119,87,0) 36%,
      rgba(217,119,87,0.18) 50%,
      rgba(217,119,87,0) 64%
    );
    background-size: 250% 100%;
    animation: pbsSweepB 3.4s ease-in-out infinite;
    z-index: 2;
  }@keyframes pbsSweepA {
    0% { background-position: 130% 50%; }
    100% { background-position: -30% 50%; }
  }@keyframes pbsSweepB {
    0% { background-position: -30% 50%; }
    100% { background-position: 130% 50%; }
  }.pb-studio .frame .emerge {
    position: absolute;
    inset: -6%;
    background:
      radial-gradient(42% 48% at 30% 34%, rgba(212,168,83,0.6), transparent 70%),
      radial-gradient(46% 42% at 72% 64%, rgba(217,119,87,0.55), transparent 72%),
      radial-gradient(52% 56% at 52% 82%, rgba(150,112,80,0.5), transparent 75%);
    filter: blur(20px);
    opacity: 0;
    transition: opacity var(--duration-slow) var(--ease-standard);
    z-index: 3;
    pointer-events: none;
  }.pb-studio .frame .gen-progress {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: var(--text-caption);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: rgba(40,32,24,0.62);
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 4px 9px;
    border-radius: 8px;
    z-index: 6;
  }.pb-studio .frame .preview {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity var(--duration-slow) var(--ease-exit);
    z-index: 4;
  }.pb-studio .frame.done .preview { opacity: 1; }.pb-studio .frame.editable { cursor: grab; touch-action: none; }.pb-studio .frame.editable:active { cursor: grabbing; }
  .pb-studio .frame { transition: filter 0.85s cubic-bezier(0.2,0.7,0.2,1); }
  .pb-studio .frame:not(.generating):not(.done) { filter: brightness(0.88) saturate(0.92); }
  @media (prefers-reduced-motion: no-preference) {
    .pb-studio .frame.done { animation: pbsIlluminate 1.15s ease; }
  }
  @keyframes pbsIlluminate {
    0% { filter: brightness(0.88) saturate(0.92); }
    42% { filter: brightness(1.13) saturate(1.05) drop-shadow(0 0 26px rgba(238,37,50,0.26)); }
    100% { filter: brightness(1); }
  }
  .pb-studio .studio-intent-stage {
    position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 24px 16px 16px;
    overflow-y: auto; background: rgba(255,255,255,0.55); backdrop-filter: blur(8px);
  }
    to { opacity: 1; transform: scale(1); }
  }
    55% { opacity: 0.5; }
    100% { opacity: 0.1; transform: translateX(0); }
  }.pb-studio .frame-wrap.as-post {
    /* R2: share the lifted centerline so the mockup clears the prompt bar */
    top: calc((100% - 210px) / 2);
    max-height: calc(100% - 240px);
    aspect-ratio: auto;
    width: min(360px, 58%);
    max-width: 380px;
    height: auto;
    max-height: calc(100% - 150px);
    top: calc((100% - 132px) / 2);
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    place-items: stretch;
    overflow: hidden;
    border-radius: 20px;
    padding-bottom: 12px;
    background: rgba(255,255,255,0.74);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.9);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.55),
      0 0 24px 6px rgba(255,255,255,0.8),
      0 0 64px 20px rgba(255,255,255,0.45),
      0 30px 70px -26px rgba(20,20,45,0.5),
      inset 0 1px 0 rgba(255,255,255,0.95);
    color: rgba(22,22,28,0.92);
    font-size: var(--text-body-sm);
  }.pb-studio .frame-wrap.as-post.pc-platform-facebook,
  .pb-studio .frame-wrap.as-post.pc-platform-x,
  .pb-studio .frame-wrap.as-post.pc-platform-linkedin {
    width: min(424px, 64%);
    max-width: 440px;
  }.pb-studio .frame-wrap.as-post.pc-platform-tiktok {
    background: #0b0b0d;
    padding-bottom: 0;
    width: min(250px, 42%);
    max-width: 270px;
    aspect-ratio: 9 / 16;
    height: auto;
    max-height: calc(100% - 110px);
    border: 1px solid rgba(255,255,255,0.5);
  }@property --glass-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
  @keyframes pbsBorderSpin { to { --glass-angle: 360deg; } }
  .pb-studio .frame-wrap.as-post .glass-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    pointer-events: none;
    z-index: 7;
    background: conic-gradient(from var(--glass-angle, 0deg),
      rgba(255,255,255,0.55) 0deg,
      rgba(255,255,255,0.55) 200deg,
      rgba(255,255,255,0.9) 288deg,
      rgba(255,255,255,1) 322deg,
      rgba(255,255,255,1) 340deg,
      rgba(255,255,255,0.6) 360deg);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    filter: drop-shadow(0 0 5px rgba(255,255,255,0.85)) drop-shadow(0 0 2px rgba(255,255,255,0.9));
    animation: pbsBorderSpin 4s linear infinite;
  }@media (prefers-reduced-motion: reduce) {
    .pb-studio .frame-wrap.as-post .glass-border { animation: none; }
  }
  .pb-studio .frame-wrap.as-post .glass-sheen {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 6;
    opacity: 0;
    background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.55) 49%, rgba(255,255,255,0.12) 53%, transparent 64%);
  }.pb-studio .frame-wrap.as-post .frame {
    width: 100% !important;
    height: auto !important;
    max-height: min(42vh, 400px);
    flex: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    animation: none;
    background: #161616;
  }.pb-studio .frame-wrap.as-post .frame .preview { transition: none; }.pb-studio /* Prompt bar — glass morphism */
  .prompt-bar {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    width: min(680px, 78%);
    background: rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1.5px solid rgba(255, 255, 255, 0.42);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 14px 14px 12px 18px;
    gap: 10px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.5),
      0 10px 40px rgba(0,0,0,0.18);
    z-index: 15;
    transition: border-color var(--duration-moderate) var(--ease-standard), box-shadow var(--duration-moderate) var(--ease-standard), background-color var(--duration-moderate) var(--ease-standard);
  }
  @property --pb-bar-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
  /* animated brand-red glow that travels around the composer border; the
     conic is masked to a 1.6px ring (no interior bleed) and drop-shadowed
     for the halo. Brighter on focus. */
  .pb-studio .prompt-bar::before {
    content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1.6px;
    background: conic-gradient(from var(--pb-bar-angle),
      rgba(238,37,50,0.18) 0deg, rgba(238,37,50,0.24) 130deg,
      rgba(238,37,50,0.62) 250deg, #ff5560 312deg, rgba(238,37,50,0.62) 350deg,
      rgba(238,37,50,0.18) 360deg);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0.8;
    filter: drop-shadow(0 0 8px rgba(238,37,50,0.45)) drop-shadow(0 0 18px rgba(238,37,50,0.28));
    animation: pbBarGlow 9s linear infinite;
    transition: opacity var(--duration-moderate) var(--ease-standard), filter var(--duration-moderate) var(--ease-standard);
  }
  .pb-studio .prompt-bar:focus-within::before {
    opacity: 1;
    filter: drop-shadow(0 0 11px rgba(238,37,50,0.6)) drop-shadow(0 0 24px rgba(238,37,50,0.42));
  }
  .pb-studio .prompt-bar.is-generating::before {
    animation-duration: 3s;
    opacity: 1;
  }
  @keyframes pbBarGlow { to { --pb-bar-angle: 360deg; } }

  .pb-studio .pb-bar-input { display: flex; align-items: center; min-height: 30px; }
  .pb-studio .pb-bar-controls { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .pb-studio .pb-bar-spacer { flex: 1; }
  .pb-studio .pb-ref-chip {
    flex: none; display: inline-flex; align-items: center; gap: 7px;
    height: 34px; padding: 0 12px; border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.5);
    color: var(--ink-2); font-size: var(--text-caption); font-weight: 600; white-space: nowrap;
    transition: var(--transition-color);
  }
  .pb-studio .pb-ref-chip:hover { border-color: rgba(0,0,0,0.26); color: var(--ink); }
  .pb-studio .pb-ref-chip.has-image { padding: 0 8px 0 4px; }
  .pb-studio .pb-ref-chip img { width: 26px; height: 26px; border-radius: 7px; object-fit: cover; }
  .pb-studio .pb-ref-chip .pb-ref-label { max-width: 90px; overflow: hidden; text-overflow: ellipsis; }
  .pb-studio .pb-ref-chip button {
    display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; color: var(--ink-2);
  }
  .pb-studio .pb-ref-chip button:hover { background: rgba(0,0,0,0.08); color: var(--ink); }
  .pb-studio .pb-tools-trigger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px; border-radius: 10px;
    border: 1px solid var(--line-2, rgba(0,0,0,0.12));
    background: var(--surface, #fff); color: var(--ink-2, #2a2a2e);
    font-size: var(--text-body-sm, 13px); font-weight: 500; cursor: pointer;
    white-space: nowrap; max-width: 200px;
    transition: var(--transition-interactive);
  }
  .pb-studio .pb-tools-trigger span { overflow: hidden; text-overflow: ellipsis; }
  .pb-studio .pb-tools-trigger:hover { border-color: var(--ink-2, #2a2a2e); }
  .pb-studio .pb-tools-trigger.is-open,
  .pb-studio .pb-tools-trigger.has-intent {
    border-color: rgba(238,37,50,0.4); color: var(--green-deep, #c81e2a);
    background: rgba(238,37,50,0.05);
  }
  .pb-studio .pb-model-chip {
    flex: none; display: inline-flex; align-items: center; gap: 6px;
    height: 34px; padding: 0 12px; border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.5);
    color: var(--ink-2); font-size: var(--text-caption); font-weight: 600; white-space: nowrap;
    transition: var(--transition-color);
  }
  .pb-studio .pb-model-chip:hover { border-color: rgba(0,0,0,0.26); color: var(--ink); }
  .pb-studio .pb-model-chip.is-pro {
    border-color: rgba(238,37,50,0.32); background: rgba(238,37,50,0.07); color: #c41e2a;
  }
  .pb-studio .pb-model-pop { left: 0; right: auto; min-width: 230px; }
  .pb-studio .pb-model-pop button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .pb-studio .pb-model-pop button:disabled { opacity: 0.55; cursor: default; }
  .pb-studio .pb-model-name { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: var(--text-body-sm); }
  .pb-studio .pb-model-sub { font-size: var(--text-label); color: var(--ink-2); }
  .pb-studio .pb-dim-chip {
    flex: none; display: inline-flex; align-items: center; gap: 4px;
    height: 34px; padding: 0 11px; border-radius: 10px; white-space: nowrap;
    border: 1px dashed rgba(0,0,0,0.14); color: var(--ink-2); font-size: var(--text-caption); font-weight: 600;
  }
  .pb-studio .pb-size-toggle { font: inherit; color: #c41e2a; font-weight: 700; }
  .pb-studio .pb-size-toggle:hover { text-decoration: underline; }
  .pb-studio .pb-generate {
    flex: none; display: inline-flex; align-items: center; gap: 8px;
    height: 40px; padding: 0 22px; border-radius: 12px;
    background: var(--red-press, #c81e2a); border: 1px solid var(--red-press, #c81e2a); color: #fff;
    font-size: var(--text-body); font-weight: 600; white-space: nowrap;
    box-shadow: 0 12px 26px -12px rgba(238,37,50,0.7);
    transition: var(--transition-color), opacity var(--duration-fast) var(--ease-standard);
  }
  .pb-studio .pb-generate:hover:not(:disabled) { background: #d61f2b; }
  .pb-studio .pb-generate:disabled { opacity: 0.4; cursor: default; box-shadow: none; }.pb-studio .prompt-bar:focus-within {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.7);
    /* transform is GSAP-owned (hero glide) — no transform here */
  }.pb-studio .prompt-bar.is-generating {
    border-color: rgba(217,119,87,0.55);
    animation: pbsAgentPulse 2s ease-in-out infinite;
  }@keyframes pbsAgentPulse {
    0%, 100% {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(217,119,87,0.32), 0 0 18px 2px rgba(217,119,87,0.22), 0 10px 40px rgba(0,0,0,0.18);
    }
    50% {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(217,119,87,0.6), 0 0 30px 7px rgba(217,119,87,0.4), 0 10px 40px rgba(0,0,0,0.2);
    }
  }
    50% { opacity: 1; }
  }.pb-studio .prompt-bar .pb-reprompt {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(238, 37, 50, 0.28);
    background: rgba(238, 37, 50, 0.08);
    color: #c41e2a;
    font-size: var(--text-caption);
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    transition: var(--transition-color);
  }.pb-studio .prompt-bar .pb-reprompt:hover {
    background: rgba(238, 37, 50, 0.14);
    border-color: rgba(238, 37, 50, 0.42);
  }.pb-studio .prompt-bar .pb-reprompt svg {
    width: 15px;
    height: 15px;
    flex: none;
  }.pb-studio .prompt-bar .pb-util {
    width: 38px;
    height: 38px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--ink-2);
    transition: var(--transition-color);
  }.pb-studio .prompt-bar .pb-util:hover { background: rgba(0,0,0,0.05); }.pb-studio .prompt-bar .pb-util.active { color: var(--ink); background: rgba(0,0,0,0.07); }.pb-studio .prompt-bar .pb-util svg { width: 18px; height: 18px; }.pb-studio .prompt-bar .pb-tool { position: relative; display: flex; flex: none; }.pb-studio .pb-tools-pop {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    min-width: 190px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.55);
    border-radius: 14px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.2);
    z-index: 30;
    animation: pbsPopUp 0.16s ease;
  }@keyframes pbsPopUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }.pb-studio .pb-tools-pop button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    font-size: var(--text-body);
    color: var(--ink);
    transition: var(--transition-color);
  }.pb-studio .pb-tools-pop button:hover { background: rgba(0,0,0,0.05); }.pb-studio .pb-tools-pop .pro-tag {
    margin-left: auto;
    font-size: var(--text-eyebrow);
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--muted-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    padding: 1px 5px;
  }.pb-studio .prompt-bar input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: var(--text-ui);
    font-weight: 400;
    color: rgba(20, 20, 25, 0.85);
  }.pb-studio .prompt-bar input::placeholder {
    color: rgba(20, 20, 25, 0.62);
  }.pb-studio .studio-schedule-row {
    position: absolute; bottom: 216px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    border-radius: 12px; background: rgba(255,255,255,0.88);
    border: 1px solid rgba(0,0,0,0.08); font-size: var(--text-caption); z-index: 6;
  }.pb-studio .studio-schedule-row input {
    border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 4px 8px; font-size: var(--text-caption);
  }.pb-studio .studio-video-compose {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; padding: 24px;
  }.pb-studio .studio-video-preview {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    background: #fff; border-radius: inherit; overflow: hidden;
  }.pb-studio .studio-video-el { width: 100%; flex: 1; object-fit: contain; background: #000; }
  .pb-studio .studio-video-cap { padding: 10px 14px; font-size: var(--text-body-sm); line-height: 1.4; }
  .pb-studio .studio-caption-error, .pb-studio .studio-caption-error-overlay {
    font-size: var(--text-label); color: #c41e2a; margin: 6px 0 0;
  }.pb-studio .studio-caption-error-overlay {
    position: absolute; bottom: 12px; left: 14px; right: 14px;
    padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.92);
    border: 1px solid rgba(238,37,50,0.2); z-index: 8;
  }.pb-studio .studio-caption-tools {
    position: absolute; top: 50%; right: 32px; transform: translateY(-50%);
    z-index: 16; width: 268px; max-height: 72%; overflow-y: auto;
    padding: 12px; border-radius: 16px;
    background: rgba(255,255,255,0.97);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid rgba(0,0,0,0.07);
    box-shadow: 0 16px 38px -12px rgba(15,15,20,0.34);
  }
  @media (max-width: 1240px) {
    .pb-studio .studio-caption-tools {
      top: auto; bottom: 226px; right: 50%; transform: translateX(50%);
      width: min(340px, 84%); max-height: 50%;
    }
  }.pb-studio .canvas-theme-grid::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background-image:
      linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: radial-gradient(ellipse at center, #000 55%, transparent 92%);
    mask-image: radial-gradient(ellipse at center, #000 55%, transparent 92%);
  }.pb-studio .pb-tools-pop-wide { min-width: 220px; padding: 10px; }
  @media (max-width: 1379px) {.pb-studio .app {
      grid-template-columns: 232px minmax(0, 1fr);
      grid-template-areas: "sidebar canvas";
    }.pb-studio .canvas { min-height: 620px; }}@media (max-width: 860px) {.pb-studio .app { grid-template-columns: minmax(0, 1fr); grid-template-areas: "sidebar" "canvas"; }.pb-studio .canvas { min-height: 540px; }}@media (max-width: 600px) {.pb-studio .app { padding: 10px; gap: 12px; }.pb-studio .canvas { min-height: 460px; }.pb-studio .frame-wrap { width: 64%; max-width: 320px; transform: translate(-50%, -60%); }.pb-studio .prompt-bar { width: 92%; bottom: 18px; padding: 10px 10px 9px 14px; }.pb-studio .pb-bar-controls { flex-wrap: wrap; }.pb-studio .pb-ref-chip span, .pb-studio .pb-dim-chip { display: none; }.pb-studio .pb-ref-chip { padding: 0 9px; }.pb-studio .prompt-bar input { font-size: var(--text-body); }.pb-studio .canvas-top { top: 14px; left: 14px; right: 14px; }.pb-studio .dim-chip { padding: 8px 12px; font-size: var(--text-caption); }}@media (max-width: 380px) {.pb-studio .frame-wrap { width: 72%; }}

  /* ===== WHITE ROOM — simple studio (overrides; appended last to win) =====
     Enter: clean white. Composer floats in. Generate: frame materializes.
     Done: the image casts its own ambient light (blurred self behind). */
  .pb-studio .canvas {
    /* flat, even white — the generated image's ambient glow is the room's
       only light source, so it reads instead of competing with a hotspot */
    background: linear-gradient(180deg, #fcfcfb 0%, #f7f6f4 55%, #f0eeeb 100%);
  }
  .pb-studio .canvas::before { display: none; }
  .pb-studio .canvas::after { opacity: 0.05; }
  .pb-studio .canvas-wall-lines, .pb-studio .canvas-floor { display: none; }

  /* furniture re-inked for the white wall (was white-glow on concrete) */
  .pb-studio .tool-rail .rail-ico.active, .pb-studio .tool-rail .rail-ico.open { color: #1c1c1e; }
  .pb-studio .tool-rail .rail-ico.active svg, .pb-studio .tool-rail .rail-ico.open svg {
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.16));
  }
  .pb-studio .tool-rail .rail-ico:hover svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12)); }
  .pb-studio .tool-rail .rail-ico-label {
    color: #1c1c1e;
    text-shadow: 0 1px 0 rgba(255,255,255,0.85);
  }

  /* idle: no empty box — just the white room */
  .pb-studio .frame-wrap.is-idle::before { opacity: 0; animation: none; }
  .pb-studio .frame.idle .studio-intent-stage {
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .pb-studio .frame.idle {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    animation: none;
  }
  .pb-studio .frame {
    transition:
      width 0.55s cubic-bezier(0.65, 0, 0.35, 1),
      height 0.55s cubic-bezier(0.65, 0, 0.35, 1),
      background 0.6s ease,
      box-shadow 0.6s ease,
      border-color 0.6s ease;
  }

  /* composer floats in on entry; lifted to make room for the intent strip below */
  .pb-studio .prompt-bar {
    /* room below for the intent strip AND its pop-up labels; transform is
       GSAP-owned (hero-center <-> home), so transition only paint props */
    bottom: 96px;
    transition: border-color var(--duration-moderate) var(--ease-standard), box-shadow var(--duration-moderate) var(--ease-standard), background-color var(--duration-moderate) var(--ease-standard);
    animation: pbsBarIn 0.85s cubic-bezier(0.22, 1.12, 0.36, 1) 0.12s both;
    border-color: rgba(0, 0, 0, 0.07);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.7),
      0 12px 44px rgba(0,0,0,0.12);
  }
  @keyframes pbsBarIn {
    from { opacity: 0; filter: blur(10px); }
    to { opacity: 1; filter: blur(0); }
  }

  .pb-studio .top-left { display: flex; align-items: center; gap: 10px; }

  /* animated placeholder: make a [flip-word] post about… */
  .pb-studio .pb-anim-ph {
    position: absolute; inset: 0;
    display: flex; align-items: center;
    pointer-events: none; white-space: pre; overflow: hidden;
    font-size: var(--text-ui); font-weight: 400;
    color: rgba(20, 20, 25, 0.55);
  }
  @media (max-width: 600px) { .pb-studio .pb-anim-ph { font-size: var(--text-body); } }

  /* ghost-text autofill in the free-form brief */
  .pb-studio .pb-ghost-wrap { position: relative; flex: 1; display: flex; align-items: center; min-width: 0; }
  .pb-studio .pb-prefix {
    display: inline-flex; align-items: center; flex: none;
    white-space: pre; color: rgba(20, 20, 25, 0.55);
    font-size: var(--text-ui); font-weight: 400;
  }
  .pb-studio .pb-input-shell { position: relative; flex: 1; display: flex; min-width: 0; }
  .pb-studio .pb-input-shell input { width: 100%; }
  .pb-studio .pb-ghost {
    position: absolute; inset: 0;
    display: flex; align-items: center;
    pointer-events: none; white-space: pre; overflow: hidden;
    font-size: var(--text-ui); font-weight: 400;
  }
  .pb-studio .pb-ghost-typed { color: transparent; }
  .pb-studio .pb-ghost-rest { color: rgba(20, 20, 25, 0.32); }
  .pb-studio .pb-ghost-key {
    margin-left: 10px; padding: 2px 7px; border-radius: 5px; flex: none;
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: rgba(20,20,25,0.66); border: 1px solid rgba(20,20,25,0.3);
    background: rgba(255,255,255,0.6);
  }
  @media (max-width: 600px) { .pb-studio .pb-ghost { font-size: var(--text-body); } }
  .pb-studio .post-soon {
    font-style: normal; font-size: var(--text-eyebrow); font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; color: #c81e2a; margin-left: 6px;
  }
  .pb-studio .dim-chip .icon { width: 15px; height: 15px; }

  /* on-canvas 3D stack of recent generations behind the live image */
  .pb-studio .gen-stack {
    position: absolute;
    inset: 0;
    perspective: 1100px;
    transform-style: preserve-3d;
    z-index: 5;
    pointer-events: none;
  }
  .pb-studio .gs-card {
    position: absolute;
    top: calc((100% - 210px) / 2);
    left: 50%;
    width: 250px;
    aspect-ratio: 4 / 5;
    border: none;
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 18px 44px -22px rgba(20,20,40,0.35);
    transition: transform 0.7s cubic-bezier(0.62, 0.28, 0.23, 0.99), opacity 0.5s ease;
    animation: gsArrive 0.7s cubic-bezier(0.62, 0.28, 0.23, 0.99);
  }
  @keyframes gsArrive { from { opacity: 0; } }
  .pb-studio .gs-card .gs-img {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    filter: saturate(0.85);
  }
  /* the white-room fade mask: each card melts toward its outer edge */
  .pb-studio .gs-card .gs-fade { position: absolute; inset: 0; }
  .pb-studio .gs-0 {
    transform: translate(calc(-50% - 330px), -50%) translateZ(-150px) rotateY(40deg);
    opacity: 0.85;
  }
  .pb-studio .gs-0 .gs-fade { background: linear-gradient(270deg, transparent 30%, rgba(252,252,251,0.9) 100%); }
  .pb-studio .gs-1 {
    transform: translate(calc(-50% + 330px), -50%) translateZ(-150px) rotateY(-40deg);
    opacity: 0.85;
  }
  .pb-studio .gs-1 .gs-fade { background: linear-gradient(90deg, transparent 30%, rgba(252,252,251,0.9) 100%); }
  .pb-studio .gs-2 {
    transform: translate(calc(-50% - 520px), -50%) translateZ(-260px) rotateY(46deg);
    opacity: 0.55;
  }
  .pb-studio .gs-2 .gs-fade { background: linear-gradient(270deg, rgba(252,252,251,0.35) 0%, rgba(252,252,251,0.96) 100%); }
  .pb-studio .gs-card:hover, .pb-studio .gs-card:focus-visible { opacity: 1; }
  .pb-studio .gs-card:hover .gs-img { filter: saturate(1); }
  @media (max-width: 1100px) { .pb-studio .gen-stack { display: none; } }
  @media (prefers-reduced-motion: reduce) {
    .pb-studio .gs-card { transition: opacity var(--duration-moderate) var(--ease-standard); animation: none; }
  }

  /* done: just the image — no paper-sheet pulse, no white glow ring. The
     ambient color glow behind it is the only halo. */
  .pb-studio .frame.done {
    animation: none;
    border: none;
    border-radius: 10px;
    background: transparent;
    box-shadow: 0 22px 54px rgba(0,0,0,0.22);
  }
  .pb-studio .frame-wrap:not(.as-post):has(.frame.done)::before { opacity: 0; animation: none; }


  /* ambient backlight: blurred copy of the generated image behind the frame */
  .pb-studio .frame-wrap .ambient-glow {
    position: absolute;
    inset: -9% -11% -12%;
    border-radius: 40px;
    background-size: cover;
    background-position: center;
    filter: blur(48px) saturate(1.3);
    opacity: 0;
    z-index: -1;
    pointer-events: none;
    animation: pbsAmbient 1.4s ease 0.5s forwards;
  }
  @keyframes pbsAmbient { to { opacity: 0.55; } }

  @media (prefers-reduced-motion: reduce) {
    .pb-studio .prompt-bar { animation: none; }
    .pb-studio .frame-wrap .ambient-glow { animation: none; opacity: 0.55; }
  }

  /* R4: the white-room overrides above out-cascade the ≤600px rules that
     live earlier in this sheet — re-assert mobile layout here, last. */
  @media (max-width: 600px) {
    .pb-studio .prompt-bar { bottom: 70px; width: 92%; }
  }
    `}</style>
  );
}
