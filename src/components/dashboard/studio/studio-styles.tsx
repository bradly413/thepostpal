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
    --sans: var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
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
    /* Canvas-only: AppSidebar lives in DashboardShell (not nested here). */
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "canvas";
    gap: 0;
    padding: 0;
    min-height: 100%;
    height: 100%;
    max-width: none;
    margin: 0;
    align-items: stretch;
  }.pb-studio .studio-error.studio-soft-notice {
    border-color: rgba(26, 26, 46, 0.12);
    background: rgba(255, 255, 255, 0.88);
  }
  .pb-studio .studio-error.studio-soft-notice p {
    color: rgba(26, 26, 46, 0.72);
  }
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
  }.pb-studio .studio-error-cta {
    display: inline-block; margin: 8px 10px 0 0; padding: 7px 14px;
    border-radius: 9px; background: var(--red-press, #c81e2a); color: #fff;
    font-size: var(--text-caption); font-weight: 600; text-decoration: none;
    transition: var(--transition-color);
  }.pb-studio .studio-error-cta:hover { background: #a81824; }.pb-studio .canvas { grid-area: canvas; min-width: 0; }.pb-studio /* ============ CANVAS ============ */
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
    top: 14px;
    left: 14px;
    right: 14px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 10px;
    z-index: 20;
    pointer-events: none;
  }
  .pb-studio .canvas-top > * {
    pointer-events: auto;
  }
  .pb-studio .canvas-top .top-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1 1 auto;
    order: 1;
  }
  .pb-studio .canvas-top .top-toggles {
    flex: 0 0 auto;
    order: 2;
    margin-left: auto;
  }
  .pb-studio .canvas-top .top-actions {
    display: none;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    order: 3;
  }
  .pb-studio .canvas-top.has-actions .top-actions {
    display: flex;
  }
  .pb-studio .canvas-top .top-actions[aria-hidden="true"] {
    display: none;
  }
  .pb-studio .canvas-top.has-actions {
    top: 12px;
  }
  /* Wide desktop: keep actions on the first row, centered between sides */
  @media (min-width: 1280px) {
    .pb-studio .canvas-top.has-actions {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) auto minmax(120px, 1fr);
      align-items: center;
    }
    .pb-studio .canvas-top.has-actions .top-left {
      order: unset;
      flex: unset;
    }
    .pb-studio .canvas-top.has-actions .top-actions {
      order: unset;
      width: auto;
      max-width: none;
      justify-self: center;
    }
    .pb-studio .canvas-top.has-actions .top-toggles {
      order: unset;
      margin-left: 0;
      justify-self: end;
    }
  }
  /* Tablet / mid desktop: icon-only actions + drop platform dimensions */
  @media (max-width: 1279px) {
    .pb-studio .dim-chip .post-meta {
      display: none;
    }
    .pb-studio .top-actions .preview-toggle {
      padding: 8px;
      min-width: 40px;
      justify-content: center;
    }
    .pb-studio .top-actions .preview-toggle span {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }
  @media (max-width: 1100px) {
    .pb-studio .studio-mode-toggle .preview-toggle {
      padding: 8px;
      min-width: 40px;
      justify-content: center;
    }
    .pb-studio .studio-mode-toggle .preview-toggle span {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .pb-studio .dim-chip .post-label {
      display: none;
    }
    .pb-studio .canvas:has(.canvas-top.has-actions) .frame-wrap {
      --studio-top-chrome: 108px;
    }
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
  }.pb-studio .post-option:hover { background: rgba(0,0,0,0.05); }.pb-studio .post-option.active { background: rgba(0,0,0,0.06); font-weight: 600; }.pb-studio .post-option .po-dim { color: var(--muted); font-size: var(--text-caption); font-variant-numeric: tabular-nums;   }.pb-studio .top-toggles {
    display: flex;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    border: 1px solid rgba(26,26,46,0.1);
    border-radius: 12px;
    padding: 4px;
    gap: 2px;
    box-shadow: 0 4px 16px rgba(20,20,40,0.1);
  }.pb-studio .top-toggles button {
    width: 36px; height: 32px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: #3a3a42;
    transition: var(--transition-color);
  }.pb-studio .top-toggles button.active { background: #fff; color: #151528; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }.pb-studio .top-toggles button:not(.active):hover { background: rgba(0,0,0,0.05); color: #151528; }.pb-studio .top-toggles button svg { width: 16px; height: 16px; stroke-width: 2; }.pb-studio .preview-toggle {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 12px;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    font-size: var(--text-body-sm); font-weight: 600; color: var(--ink);
    cursor: pointer; transition: var(--transition-interactive);
  }.pb-studio .preview-toggle:hover { background: #fff; transform: translateY(-1px); }.pb-studio .preview-toggle svg { width: 15px; height: 15px; }.pb-studio .preview-toggle[aria-pressed="true"],
  .pb-studio .preview-toggle.is-sched { background: var(--red-press, #c81e2a); color: #fff; border-color: transparent; box-shadow: 0 6px 18px -6px rgba(200,30,42,0.55); }.pb-studio .studio-mode-toggle { display: inline-flex; gap: 6px; }.pb-studio .studio-video-cancel {
    display: block; margin-top: 6px; border: none; background: transparent;
    font-size: 11px; font-weight: 700; color: #c41e2a; cursor: pointer; text-decoration: underline;
  }.pb-studio /* Minimal control rail — left of the image */
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
  }.pb-studio /* Chat thread — bubbles + live image slot */
  .studio-chat-thread {
    position: absolute;
    inset: 72px 0 200px 0;
    z-index: 12;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 8px 16px 24px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    pointer-events: none;
  }
  .pb-studio .studio-chat-thread .studio-chat-inner,
  .pb-studio .studio-chat-thread .studio-chat-bubble,
  .pb-studio .studio-chat-thread .studio-chat-image-card,
  .pb-studio .studio-chat-thread .studio-chat-msg-asst {
    pointer-events: auto;
  }
  .pb-studio .studio-result-stage {
    position: absolute;
    inset: 88px 24px 210px;
    z-index: 14;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .pb-studio .studio-result-stage img {
    display: block;
    width: auto;
    height: auto;
    max-width: min(420px, 72%);
    max-height: min(52vh, 480px);
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 18px 48px -18px rgba(20, 20, 40, 0.55);
    background: #fff;
    pointer-events: none;
  }
  .pb-studio .studio-result-stage--missing {
    pointer-events: auto;
  }
  .pb-studio .studio-result-stage--missing p {
    margin: 0;
    max-width: 320px;
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(200, 30, 42, 0.25);
    color: #c81e2a;
    font-size: 14px;
    line-height: 1.4;
    text-align: center;
    box-shadow: 0 12px 28px -16px rgba(20, 20, 40, 0.4);
  }
  /* Hide the empty grey frame once the result stage owns the pixels */
  .pb-studio .frame-wrap.is-chat-result {
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }

  /* ===== Coverflow carousel (selected / prev / next) =====
     Three vertical bands when active:
     1) chat (top)  2) coverflow stage (middle)  3) prompt bar (bottom). */
  .pb-studio .studio-coverflow {
    --cf-top-band: max(148px, 24vh);
    --cf-prompt-reserve: 208px;
    position: absolute;
    top: var(--cf-top-band);
    right: 12px;
    bottom: var(--cf-prompt-reserve);
    left: 12px;
    z-index: 14;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    pointer-events: none;
  }
  .pb-studio .canvas:has(.canvas-top.has-actions) .studio-coverflow {
    --cf-top-band: max(168px, 26vh);
  }
  .pb-studio .studio-coverflow-track {
    position: relative;
    width: min(720px, 100%);
    height: min(38vh, 320px);
    max-height: 100%;
    overflow: hidden;
    pointer-events: none;
  }
  .pb-studio .studio-coverflow-slide {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: transform 0.85s cubic-bezier(0.65, 0, 0.35, 1), left 0.85s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.85s ease, z-index 0s;
    opacity: 1;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }
  .pb-studio .studio-coverflow-slide img,
  .pb-studio .studio-coverflow-skeleton {
    display: block;
    width: min(240px, 28vw);
    max-height: min(36vh, 300px);
    aspect-ratio: var(--cf-aspect, 4 / 5);
    height: auto;
    object-fit: cover;
    border-radius: 6px;
    background: #e8e8ea;
    box-shadow: 0 14px 36px -16px rgba(20, 20, 40, 0.45);
    transition: width 0.85s cubic-bezier(0.65, 0, 0.35, 1), max-height 0.85s cubic-bezier(0.65, 0, 0.35, 1);
  }
  .pb-studio .studio-coverflow-skeleton {
    position: relative;
    overflow: hidden;
  }
  .pb-studio .studio-coverflow-skel-pulse {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%);
    animation: pbsCfPulse 1.4s ease-in-out infinite;
  }
  @keyframes pbsCfPulse {
    0% { transform: translateX(-60%); }
    100% { transform: translateX(60%); }
  }
  .pb-studio .studio-coverflow-badge {
    position: absolute;
    left: 8px;
    bottom: 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(26, 26, 46, 0.72);
    background: rgba(255, 255, 255, 0.92);
    border-radius: 999px;
    padding: 3px 9px;
    pointer-events: none;
  }
  .pb-studio .studio-coverflow-slide.hideLeft {
    left: 0%;
    opacity: 0;
    transform: translate(-50%, -50%) translateY(8%);
    z-index: 1;
    pointer-events: none;
  }
  .pb-studio .studio-coverflow-slide.hideLeft img,
  .pb-studio .studio-coverflow-slide.hideLeft .studio-coverflow-skeleton {
    width: min(110px, 14vw);
    max-height: min(22vh, 160px);
  }
  .pb-studio .studio-coverflow-slide.hideRight {
    left: 100%;
    opacity: 0;
    transform: translate(-50%, -50%) translateY(8%);
    z-index: 1;
    pointer-events: none;
  }
  .pb-studio .studio-coverflow-slide.hideRight img,
  .pb-studio .studio-coverflow-slide.hideRight .studio-coverflow-skeleton {
    width: min(110px, 14vw);
    max-height: min(22vh, 160px);
  }
  .pb-studio .studio-coverflow-slide.prevLeftSecond {
    z-index: 4;
    left: 16%;
    transform: translate(-50%, -50%) translateY(6%);
    opacity: 0.7;
  }
  .pb-studio .studio-coverflow-slide.prevLeftSecond img,
  .pb-studio .studio-coverflow-slide.prevLeftSecond .studio-coverflow-skeleton {
    width: min(130px, 16vw);
    max-height: min(26vh, 190px);
  }
  .pb-studio .studio-coverflow-slide.nextRightSecond {
    z-index: 4;
    left: 84%;
    transform: translate(-50%, -50%) translateY(6%);
    opacity: 0.7;
  }
  .pb-studio .studio-coverflow-slide.nextRightSecond img,
  .pb-studio .studio-coverflow-slide.nextRightSecond .studio-coverflow-skeleton {
    width: min(130px, 16vw);
    max-height: min(26vh, 190px);
  }
  .pb-studio .studio-coverflow-slide.prev {
    z-index: 5;
    left: 28%;
    transform: translate(-50%, -50%) translateY(14px);
  }
  .pb-studio .studio-coverflow-slide.prev img,
  .pb-studio .studio-coverflow-slide.prev .studio-coverflow-skeleton {
    width: min(180px, 22vw);
    max-height: min(30vh, 240px);
  }
  .pb-studio .studio-coverflow-slide.next {
    z-index: 5;
    left: 72%;
    transform: translate(-50%, -50%) translateY(14px);
  }
  .pb-studio .studio-coverflow-slide.next img,
  .pb-studio .studio-coverflow-slide.next .studio-coverflow-skeleton {
    width: min(180px, 22vw);
    max-height: min(30vh, 240px);
  }
  .pb-studio .studio-coverflow-slide.selected {
    z-index: 10;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .pb-studio .studio-coverflow-slide.selected img,
  .pb-studio .studio-coverflow-slide.selected .studio-coverflow-skeleton {
    width: min(240px, 28vw);
    max-height: min(36vh, 300px);
    box-shadow: 0 18px 44px -14px rgba(20, 20, 40, 0.5);
  }
  .pb-studio .studio-coverflow-buttons {
    position: relative;
    z-index: 15;
    flex: none;
    display: flex;
    gap: 10px;
    margin-top: 0;
    pointer-events: auto;
  }
  .pb-studio .studio-coverflow-nav {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 36px;
    min-width: 24px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(26, 26, 46, 0.1);
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
    color: #1a1a2e;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 20px -12px rgba(20, 20, 40, 0.35);
  }
  .pb-studio .studio-coverflow-nav:hover:not(:disabled) {
    background: #fff;
  }
  .pb-studio .studio-coverflow-nav:disabled {
    opacity: 0.4;
    cursor: default;
  }
  /* Chat stays in the top band only while coverflow owns the middle stage */
  .pb-studio .canvas:has(.studio-coverflow) .studio-chat-thread {
    bottom: auto;
    height: max(132px, calc(24vh - 8px));
    max-height: max(132px, calc(24vh - 8px));
    padding-bottom: 8px;
  }
  .pb-studio .canvas:has(.canvas-top.has-actions):has(.studio-coverflow) .studio-chat-thread {
    inset-block-start: 100px;
    height: max(110px, calc(26vh - 40px));
    max-height: max(110px, calc(26vh - 40px));
  }
  @media (max-width: 768px) {
    .pb-studio .studio-coverflow {
      --cf-top-band: max(120px, 20vh);
      --cf-prompt-reserve: calc(220px + env(safe-area-inset-bottom, 0px));
      left: 8px;
      right: 8px;
    }
    .pb-studio .canvas:has(.canvas-top.has-actions) .studio-coverflow {
      --cf-top-band: max(148px, 22vh);
    }
    .pb-studio .studio-coverflow-track { height: min(34vh, 280px); }
    .pb-studio .studio-coverflow-slide img,
    .pb-studio .studio-coverflow-skeleton {
      width: min(200px, 42vw);
      max-height: min(32vh, 260px);
    }
    .pb-studio .studio-coverflow-slide.selected img,
    .pb-studio .studio-coverflow-slide.selected .studio-coverflow-skeleton {
      width: min(200px, 42vw);
      max-height: min(32vh, 260px);
    }
    .pb-studio .studio-coverflow-slide.prev img,
    .pb-studio .studio-coverflow-slide.prev .studio-coverflow-skeleton,
    .pb-studio .studio-coverflow-slide.next img,
    .pb-studio .studio-coverflow-slide.next .studio-coverflow-skeleton {
      width: min(150px, 30vw);
      max-height: min(26vh, 200px);
    }
    .pb-studio .studio-coverflow-slide.prev { left: 22%; }
    .pb-studio .studio-coverflow-slide.next { left: 78%; }
    .pb-studio .studio-coverflow-slide.prevLeftSecond,
    .pb-studio .studio-coverflow-slide.nextRightSecond { opacity: 0; pointer-events: none; }
    .pb-studio .canvas:has(.studio-coverflow) .studio-chat-thread {
      height: max(96px, calc(20vh - 8px));
      max-height: max(96px, calc(20vh - 8px));
    }
    .pb-studio .canvas:has(.canvas-top.has-actions):has(.studio-coverflow) .studio-chat-thread {
      height: max(88px, calc(22vh - 36px));
      max-height: max(88px, calc(22vh - 36px));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pb-studio .studio-coverflow-slide,
    .pb-studio .studio-coverflow-slide img,
    .pb-studio .studio-coverflow-skeleton {
      transition: none;
    }
    .pb-studio .studio-coverflow-skel-pulse { animation: none; }
  }

  .pb-studio .canvas:has(.canvas-top.has-actions) .studio-chat-thread {
    inset-block-start: 100px;
  }
  .pb-studio .studio-chat-inner {
    max-width: min(560px, 100%);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: min-content;
    padding-bottom: 12px;
  }
  .pb-studio .studio-chat-bubble {
    max-width: min(420px, 92%);
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--ink, #1a1a2e);
    animation: pbsChatIn 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  @keyframes pbsChatIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .pb-studio .studio-chat-bubble { animation: none; }
  }
  .pb-studio .studio-chat-bubble--user {
    align-self: flex-end;
    background: rgba(238, 37, 50, 0.1);
    border: 1px solid rgba(238, 37, 50, 0.18);
    border-bottom-right-radius: 6px;
  }
  .pb-studio .studio-chat-bubble--assistant {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(26, 26, 46, 0.08);
    border-bottom-left-radius: 6px;
    backdrop-filter: blur(12px);
  }
  .pb-studio .studio-chat-welcome {
    max-width: min(460px, 96%);
    color: rgba(26, 26, 46, 0.72);
  }
  .pb-studio .studio-chat-msg-asst {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .pb-studio .studio-chat-msg-asst.is-working .studio-chat-bubble--assistant {
    color: rgba(26, 26, 46, 0.55);
  }
  .pb-studio .studio-chat-format-badge,
  .pb-studio .studio-chat-aspect-badge {
    display: inline-block;
    margin-top: 6px;
    margin-right: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(26, 26, 46, 0.55);
    background: rgba(0, 0, 0, 0.04);
    border-radius: 999px;
    padding: 2px 8px;
  }
  .pb-studio .studio-chat-image-card {
    position: relative;
    width: min(320px, 78vw);
    min-height: 160px;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 12px 32px -16px rgba(20, 20, 40, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.04);
  }
  .pb-studio .studio-chat-image-card img {
    display: block;
    width: 100%;
    height: auto;
    min-height: 160px;
    object-fit: cover;
    vertical-align: middle;
  }
  .pb-studio .studio-chat-image-card--error {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    min-height: 88px;
  }
  .pb-studio .studio-chat-image-card--error p {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: rgba(26, 26, 46, 0.72);
    text-align: center;
  }
  .pb-studio .studio-chat-format-badge.on-image {
    position: absolute;
    left: 8px;
    bottom: 8px;
    margin: 0;
    background: rgba(255, 255, 255, 0.9);
  }
  .pb-studio .studio-recent-prompts {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 10px 12px 0;
    scrollbar-width: none;
  }
  .pb-studio .studio-recent-prompts::-webkit-scrollbar { display: none; }
  .pb-studio .studio-recent-chip {
    flex: 0 0 auto;
    max-width: 200px;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    color: rgba(26, 26, 46, 0.72);
    background: rgba(255, 255, 255, 0.65);
    border: 1px solid rgba(26, 26, 46, 0.08);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .pb-studio .studio-recent-chip:hover {
    background: #fff;
    border-color: rgba(238, 37, 50, 0.28);
  }
  .pb-studio .pb-aspect-chip,
  .pb-studio .pb-format-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .pb-studio .pb-aspect-chip.is-pinned {
    border-color: rgba(238, 37, 50, 0.35);
    color: #c81e2a;
  }
  .pb-studio /* Frame sits in the clear band between top chrome and prompt bar. */
  .frame-wrap {
    --studio-top-chrome: 72px;
    --studio-prompt-reserve: 260px;
    position: absolute;
    /* Bias slightly above geometric center so the frame clears a tall composer */
    top: calc(var(--studio-top-chrome) + (100% - var(--studio-top-chrome) - var(--studio-prompt-reserve)) * 0.42);
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    display: grid;
    place-items: center;
    max-height: calc(100% - var(--studio-top-chrome) - var(--studio-prompt-reserve));
    transition: width 0.5s cubic-bezier(0.65, 0, 0.35, 1), height 0.5s cubic-bezier(0.65, 0, 0.35, 1);
  }
  .pb-studio .canvas:has(.canvas-top.has-actions) .frame-wrap {
    --studio-top-chrome: 120px;
  }
  @media (min-width: 1280px) {
    .pb-studio .canvas:has(.canvas-top.has-actions) .frame-wrap {
      --studio-top-chrome: 80px;
    }
  }
  .pb-studio .canvas:has(.edit-rail) .frame-wrap {
    --studio-prompt-reserve: 280px;
  }
  /* Chat UX: compact generating/idle frame under chat, clear of chips + composer */
  .pb-studio .canvas:has(.studio-chat-thread) .frame-wrap:not(.as-post):not(.is-chat-result),
  .pb-studio .canvas:has(.prompt-bar.is-chat) .frame-wrap:not(.as-post):not(.is-chat-result) {
    --studio-top-chrome: max(110px, 16vh);
    --studio-prompt-reserve: 280px;
    max-width: min(200px, 26vw);
    max-height: min(28vh, 250px, calc(100% - var(--studio-top-chrome) - var(--studio-prompt-reserve)));
    top: calc(var(--studio-top-chrome) + (100% - var(--studio-top-chrome) - var(--studio-prompt-reserve)) * 0.36);
  }
  .pb-studio .canvas:has(.studio-chat-thread):has(.canvas-top.has-actions) .frame-wrap:not(.as-post):not(.is-chat-result),
  .pb-studio .canvas:has(.prompt-bar.is-chat):has(.canvas-top.has-actions) .frame-wrap:not(.as-post):not(.is-chat-result) {
    --studio-top-chrome: max(128px, 18vh);
  }
  .pb-studio .canvas:has(.studio-chat-thread):has(.edit-rail) .frame-wrap:not(.as-post):not(.is-chat-result),
  .pb-studio .canvas:has(.prompt-bar.is-chat):has(.edit-rail) .frame-wrap:not(.as-post):not(.is-chat-result) {
    --studio-prompt-reserve: 300px;
  }
  .pb-studio .frame-wrap.is-generating:not(.as-post) {
    max-width: min(200px, 26vw);
    max-height: min(28vh, 250px);
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
    border-radius: 0;
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
    padding: 8px 12px;
    border-radius: 8px;
    z-index: 6;
    pointer-events: auto;
    max-width: min(280px, 70%);
  }.pb-studio .frame .preview {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity var(--duration-slow) var(--ease-exit);
    z-index: 4;
  }.pb-studio .frame.done .preview { opacity: 1 !important; }.pb-studio .frame.editable { cursor: grab; touch-action: none; }.pb-studio .frame.editable:active { cursor: grabbing; }
  .pb-studio .frame .preview-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    z-index: 5;
    opacity: 1 !important;
    pointer-events: none;
  }
  .pb-studio .frame { transition: filter 0.85s cubic-bezier(0.2,0.7,0.2,1); }
  .pb-studio .frame:not(.generating):not(.done) { filter: brightness(0.88) saturate(0.92); }
  @media (prefers-reduced-motion: no-preference) {
    .pb-studio .frame.done { animation: pbsIlluminate 1.15s ease forwards; }
  }
  .pb-studio .frame.done { filter: brightness(1.02) saturate(1.04); }
  @keyframes pbsIlluminate {
    0% { filter: brightness(0.88) saturate(0.92); }
    42% { filter: brightness(1.06) saturate(1.05) drop-shadow(0 0 26px rgba(238,37,50,0.26)); }
    100% { filter: brightness(1.02) saturate(1.04); }
  }
  .pb-studio .studio-intent-stage {
    position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 24px 16px 16px;
    overflow-y: auto; background: rgba(255,255,255,0.55); backdrop-filter: blur(8px);
  }
  /* Platform-preview media (portrait FB/IG) is aspect-driven and would push the
     post card past the canvas; cap it so the whole mockup fits the band. */
  .pb-studio .fbpv-media, .pb-studio .igpv-media { max-height: min(38vh, 360px); }
  .pb-studio .frame-wrap.as-post {
    aspect-ratio: auto;
    width: min(320px, 52%);
    max-width: 340px;
    height: auto;
    /* centered in the band between the top toolbar and the prompt bar */
    max-height: calc(100% - 268px);
    top: calc(50% - 74px);
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
    width: min(372px, 56%);
    max-width: 388px;
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
    max-height: min(40vh, 360px);
    flex: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    animation: none;
    background: #161616;
  }.pb-studio /* Prompt bar — frosted glass writing surface */
  .prompt-bar {
    position: absolute;
    bottom: 28px;
    /* Sticky bottom composer for chat UX. */
    left: 0;
    right: 0;
    margin-inline: auto;
    width: min(640px, calc(100% - 48px));
    max-width: calc(100% - 48px);
    transform: none;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(28px) saturate(1.65);
    -webkit-backdrop-filter: blur(28px) saturate(1.65);
    border: 1px solid rgba(255, 255, 255, 0.78);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0;
    gap: 0;
    box-shadow:
      0 22px 56px -26px rgba(20, 20, 40, 0.42),
      0 0 0 1px rgba(26, 26, 46, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
    z-index: 15;
    overflow: hidden;
    max-height: min(48vh, calc(100% - 96px));
    transition:
      box-shadow var(--duration-moderate) var(--ease-standard),
      width 0.45s cubic-bezier(0.65, 0, 0.35, 1),
      max-height 0.45s cubic-bezier(0.65, 0, 0.35, 1),
      background 0.2s ease;
  }
  .pb-studio .prompt-bar.is-chat {
    width: min(680px, calc(100% - 40px));
  }
  .pb-studio .prompt-bar.is-review {
    width: min(560px, 88%);
  }
  .pb-studio .prompt-bar.is-grown {
    top: 50%;
    bottom: auto;
    left: 0;
    right: 0;
    margin-inline: auto;
    transform: translateY(-50%);
    width: min(440px, 92%);
    max-width: calc(100% - 48px);
    max-height: min(86vh, calc(100% - 48px));
    display: flex;
    flex-direction: column;
    border-radius: 22px;
    overflow: hidden;
    box-shadow:
      0 12px 40px rgba(0, 0, 0, 0.1),
      0 2px 8px rgba(0, 0, 0, 0.04);
  }
  .pb-studio .prompt-bar.is-grown.is-generating {
    width: min(400px, 90%);
    pointer-events: none;
  }
  .pb-studio .canvas-top.is-grown-chrome .top-left {
    visibility: hidden;
    pointer-events: none;
  }
  .pb-studio .pb-feed-status {
    position: relative;
    z-index: 1;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    font-size: 12.5px;
    font-weight: 600;
    color: rgba(28, 28, 30, 0.62);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
  .pb-studio .pb-feed-turn {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: none;
  }
  .pb-studio .pb-feed-prompt {
    display: block;
    width: calc(100% - 8px);
    margin: 0 4px;
    padding: 2px 6px;
    border: none;
    background: transparent;
    text-align: left;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    color: rgba(28, 28, 30, 0.72);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pb-studio .pb-feed-prompt.is-static {
    cursor: default;
    margin: 0 4px;
  }
  .pb-studio .pb-feed-prompt:hover {
    color: #1c1c1e;
  }
  .pb-studio .prompt-bar::before { display: none; }
  .pb-studio .prompt-bar:focus-within {
    background: rgba(255, 255, 255, 0.7);
    box-shadow:
      0 22px 56px -26px rgba(20, 20, 40, 0.48),
      0 0 0 3px rgba(238, 37, 50, 0.12),
      0 1px 0 rgba(255, 255, 255, 0.92) inset;
  }

  /* Growing card: prompt above image; card sizes to content (ChatGPT-style). */
  .pb-studio .pb-media-feed {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px 14px 4px;
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 0;
    flex: 0 1 auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .pb-studio .pb-feed-card {
    flex: none;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    outline: none;
  }
  .pb-studio .pb-feed-card.is-active {
    cursor: default;
  }
  .pb-studio .pb-feed-card:not(.is-active):hover .pb-feed-frame {
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  }
  .pb-studio .pb-feed-card:not(.is-active):focus-visible .pb-feed-frame {
    outline: 2px solid rgba(200, 30, 42, 0.55);
    outline-offset: 2px;
  }
  .pb-studio .pb-feed-frame {
    position: relative;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    background: #eef0f2;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
    max-height: min(48vh, 420px);
  }
  .pb-studio .pb-feed-frame.editable {
    cursor: grab;
    touch-action: none;
  }
  .pb-studio .pb-feed-frame.editable:active {
    cursor: grabbing;
  }
  .pb-studio .pb-feed-frame img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform-origin: center center;
  }
  .pb-studio .pb-feed-card.is-generating .pb-feed-frame {
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 5 !important;
    max-height: min(38vh, 320px);
    min-height: 180px;
    background: linear-gradient(180deg, #f3f4f6 0%, #e8eaed 100%);
  }
  .pb-studio .pb-feed-skel {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      rgba(255, 255, 255, 0) 32%,
      rgba(255, 255, 255, 0.75) 50%,
      rgba(255, 255, 255, 0) 68%
    );
    background-size: 250% 100%;
    animation: pbsSweepA 2.4s ease-in-out infinite;
  }
  .pb-studio .frame-wrap.is-shelled {
    display: none !important;
  }

  .pb-studio .pb-bar-input {
    display: flex;
    align-items: stretch;
    min-height: 56px;
    padding: 16px 18px 8px;
    flex: none;
    background: transparent;
  }
  .pb-studio .pb-bar-input--pill {
    align-items: center;
    gap: 8px;
    min-height: 56px;
    margin: 10px 14px 8px;
    padding: 8px 8px 8px 10px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.04),
      0 8px 24px rgba(0, 0, 0, 0.06);
  }
  .pb-studio .prompt-bar.is-grown .pb-bar-input--pill {
    margin: 8px 14px 10px;
  }
  .pb-studio .pb-bar-input--pill .pb-bar-textarea {
    min-height: 28px !important;
    padding: 6px 4px !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }
  .pb-studio .pb-pill-plus,
  .pb-studio .pb-pill-send {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
  }
  .pb-studio .pb-pill-plus {
    background: rgba(0, 0, 0, 0.05);
    color: #3a3a3e;
  }
  .pb-studio .pb-pill-plus:hover {
    background: rgba(0, 0, 0, 0.09);
  }
  .pb-studio .pb-pill-send {
    background: #111;
    color: #fff;
  }
  .pb-studio .pb-pill-send:hover:not(:disabled) {
    background: #000;
    transform: scale(1.03);
  }
  .pb-studio .pb-pill-send:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .pb-studio .pb-pill-model {
    flex: none;
    position: relative;
  }
  .pb-studio .pb-bar-input--pill .pb-model-chip {
    height: 32px;
    padding: 0 10px;
    border-radius: 999px;
    border: none;
    background: transparent;
    gap: 4px;
  }
  .pb-studio .pb-bar-input--pill .pb-model-chip:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .pb-studio .pb-bar-controls--flow {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: stretch;
    gap: 8px;
    padding: 10px 12px 14px;
    border-top: none;
    background: transparent;
  }
  .pb-studio .pb-flow-btn {
    flex: 1 1 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    height: 40px;
    padding: 0 10px;
    border-radius: 12px;
    border: none;
    background: #f0efed;
    color: #1c1c1e;
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pb-studio .pb-flow-btn:hover:not(:disabled) {
    background: #e6e4e1;
  }
  .pb-studio .pb-flow-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .pb-studio .pb-flow-btn--primary {
    background: #111;
    color: #fff;
  }
  .pb-studio .pb-flow-btn--primary:hover:not(:disabled) {
    background: #000;
  }
  .pb-studio .prompt-bar.is-grown .pb-bar-input {
    min-height: 52px;
    padding: 8px 18px 4px;
  }
  .pb-studio .prompt-bar.is-grown .pb-bar-controls {
    flex: none;
  }
  /* "image ready" review gate — shown after generation, before captioning */
  .pb-studio .pb-ready { display: flex; flex-direction: column; gap: 1px; min-height: 30px; justify-content: center; }
  .pb-studio .pb-ready-title { font-size: var(--text-body-sm, 14px); font-weight: 600; color: var(--ink, #1c1c1e); line-height: 1.25; }
  .pb-studio .pb-ready-sub { font-size: var(--text-caption, 12.5px); color: var(--muted, #8a8884); line-height: 1.3; }
  .pb-studio .pb-bar-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
    row-gap: 8px;
    padding: 10px 14px 14px;
    border-top: 1px solid rgba(26, 26, 46, 0.08);
    background: transparent;
  }
  .pb-studio .pb-bar-controls--review {
    gap: 10px;
    padding: 12px 14px 14px;
  }
  .pb-studio .pb-bar-controls--finish {
    border-top-color: rgba(0, 0, 0, 0.04);
  }
  .pb-studio .pb-tweak-tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 14px 0;
  }
  .pb-studio .pb-tweak-token {
    height: 30px;
    padding: 0 11px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: #fff;
    color: var(--ink-2, #2a2a2e);
    font-size: 12px;
    font-weight: 550;
    cursor: pointer;
    transition: var(--transition-interactive);
  }
  .pb-studio .pb-tweak-token:hover:not(:disabled) {
    border-color: rgba(0, 0, 0, 0.22);
    color: var(--ink, #1c1c1e);
    background: rgba(0, 0, 0, 0.03);
  }
  .pb-studio .pb-tweak-token:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .pb-studio .pb-media-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px 0;
    min-width: 0;
    overflow-x: auto;
  }
  .pb-studio .pb-using-source {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: none;
    height: 36px;
    padding: 0 10px 0 4px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.04);
    color: var(--ink-2, #2a2a2e);
    font-size: 12px;
    font-weight: 600;
  }
  .pb-studio .pb-using-source img {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    object-fit: cover;
    background: #ddd;
  }
  .pb-studio .pb-using-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-left: 2px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--muted, #8a8a8e);
    cursor: pointer;
  }
  .pb-studio .pb-using-clear:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--ink, #1c1c1e);
  }
  .pb-studio .pb-generate.pb-generate-finish {
    background: #15924f;
  }
  .pb-studio .pb-generate.pb-generate-finish:hover:not(:disabled) {
    background: #117a42;
  }
  .pb-studio .prompt-bar.is-finish {
    width: min(680px, 90%);
  }
  .pb-studio .pb-bar-spacer { flex: 1; }
  .pb-studio .pb-bar-extras {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .pb-studio .prompt-bar.is-review {
    width: min(560px, 88%);
  }
  .pb-studio .pb-options-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: #fff;
    color: var(--ink-2, #2a2a2e);
    font-size: var(--text-body-sm, 13px);
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;
    transition: var(--transition-interactive);
  }
  .pb-studio .pb-options-trigger:hover,
  .pb-studio .pb-options-trigger.is-open {
    border-color: rgba(0, 0, 0, 0.22);
    color: var(--ink, #1c1c1e);
  }
  .pb-studio .pb-review-options {
    left: 0;
    right: auto;
    min-width: 240px;
  }
  .pb-studio .pb-review-menu-hosts {
    position: relative;
    width: 0;
    height: 0;
    overflow: visible;
  }
  .pb-studio .pb-review-menu-hosts .pb-tool {
    position: absolute;
    left: 0;
    bottom: 0;
  }
  .pb-studio .pb-review-ghost {
    flex: none;
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--ink-2, #2a2a2e);
    font-size: var(--text-body-sm, 13px);
    font-weight: 550;
    cursor: pointer;
  }
  .pb-studio .pb-review-ghost:hover {
    color: var(--ink, #1c1c1e);
    background: rgba(0, 0, 0, 0.04);
  }
  .pb-studio .pb-generate.pb-generate-secondary {
    background: #fff;
    color: var(--ink, #1c1c1e);
    border: 1px solid rgba(0, 0, 0, 0.12);
    margin-left: 0;
    height: 38px;
    padding: 0 14px;
    border-radius: 9px;
    font-weight: 600;
  }
  .pb-studio .pb-generate.pb-generate-secondary:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.2);
  }
  .pb-studio .pb-generate.pb-generate-next {
    background: #c81e2a;
    margin-left: 0;
  }
  .pb-studio .pb-generate.pb-generate-next:hover:not(:disabled) {
    background: #a81824;
  }
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
  /* read-only platform status (not a button) — shown while composing once
     the flipping lead-in is hidden. Borderless + muted to read as a label. */
  .pb-studio .pb-plat-cue {
    flex: none; display: inline-flex; align-items: center; gap: 5px;
    height: 34px; padding: 0 6px; white-space: nowrap; cursor: default;
    color: var(--muted, #8a8884); font-size: var(--text-caption); font-weight: 600;
  }
  .pb-studio .pb-plat-cue svg { width: 15px; height: 15px; opacity: 0.9; }
  .pb-studio .pb-size-toggle { font: inherit; color: #c41e2a; font-weight: 700; }
  .pb-studio .pb-size-toggle:hover { text-decoration: underline; }
  .pb-studio .pb-generate {
    flex: none; display: inline-flex; align-items: center; gap: 8px;
    height: 36px; padding: 0 18px; border-radius: 10px;
    background: var(--red-press, #c81e2a); border: none; color: #fff;
    font-size: 14px; font-weight: 600; white-space: nowrap;
    box-shadow: none;
    transition: background var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard);
  }
  .pb-studio .pb-generate.pb-generate-primary {
    background: #111111;
    margin-left: auto;
    border-radius: 9px;
    height: 38px;
    padding: 0 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .pb-studio .pb-generate.pb-generate-primary:hover:not(:disabled) { background: #2a2a2a; }
  .pb-studio .pb-generate:hover:not(:disabled) { background: #d61f2b; }
  .pb-studio .pb-generate:disabled { opacity: 0.4; cursor: default; }
  .pb-studio .pb-generate svg { width: 15px; height: 15px; }
  .pb-studio .prompt-bar.is-generating {
    animation: pbsAgentPulse 2s ease-in-out infinite;
  }
  @keyframes pbsAgentPulse {
    0%, 100% {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(217,119,87,0.2);
    }
    50% {
      box-shadow: 0 6px 28px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(217,119,87,0.35);
    }
  }
  .pb-studio .prompt-bar .pb-reprompt {
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
  }
  .pb-studio .prompt-bar .pb-reprompt:hover {
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
  }.pb-studio .prompt-bar input,
  .pb-studio .prompt-bar textarea.pb-bar-textarea {
    flex: 1;
    width: 100%;
    min-height: 28px;
    max-height: 168px;
    resize: none;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15px;
    line-height: 1.55;
    font-weight: 400;
    color: #111111;
    padding: 0;
    overflow-y: auto;
    font-family: inherit;
  }
  .pb-studio .prompt-bar textarea.pb-bar-textarea::placeholder,
  .pb-studio .prompt-bar input::placeholder {
    color: rgba(0, 0, 0, 0.38);
    transition: opacity 0.35s ease;
  }
  .pb-studio .prompt-bar textarea.pb-bar-textarea.is-placeholder-fading::placeholder {
    opacity: 0;
  }
  .pb-studio .pb-attach {
    flex: none;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    color: #8a8a8e;
    border-radius: 8px;
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
  }
  .pb-studio .pb-attach:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #111111;
  }
  .pb-studio .pb-ref-thumb {
    position: relative;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
  .pb-studio .pb-ref-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .pb-studio .pb-ref-thumb-clear {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }
  .pb-studio .pb-ref-thumb:hover .pb-ref-thumb-clear { opacity: 1; }
  .pb-studio .studio-schedule-row {
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
  }.pb-studio .pb-caption-field {
    /* the caption field crossfades when a new option is rotated in */
    transition: opacity var(--duration-fast) var(--ease-standard);
  }
  .pb-studio .pb-caption-field.is-fading { opacity: 0; }
  /* listing-brief nudge — steer real-property posts to the reference photo */
  .pb-studio .pb-listing-nudge {
    display: flex; align-items: center; gap: 8px; width: 100%;
    margin: 6px 0 2px; padding: 7px 10px; border-radius: 10px;
    border: 1px dashed rgba(238,37,50,0.35); background: rgba(238,37,50,0.05);
    color: var(--ink-2, #2a2a2e); font-size: var(--text-caption, 12.5px);
    text-align: left; cursor: pointer; transition: var(--transition-color);
  }
  .pb-studio .pb-listing-nudge:hover { background: rgba(238,37,50,0.1); }
  .pb-studio .pb-listing-nudge svg { flex: none; color: #c41e2a; }
  .pb-studio .pb-listing-nudge strong { font-weight: 700; color: #c41e2a; }
  .pb-studio .pb-caption-status { margin-top: 2px; }
  .pb-studio .pb-caption-status .pb-caption-variants-loading,
  .pb-studio .pb-caption-status .pb-caption-variants-error { margin: 2px 2px 0; }
  .pb-studio .canvas-theme-grid::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background-image:
      linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: radial-gradient(ellipse at center, #000 55%, transparent 92%);
    mask-image: radial-gradient(ellipse at center, #000 55%, transparent 92%);
  }.pb-studio .pb-tools-pop-wide { min-width: 220px; padding: 10px; }
  @media (max-width: 1379px) {
    .pb-studio .canvas { min-height: 620px; }
  }
  @media (max-width: 980px) and (min-width: 769px) {
    .pb-studio .canvas { min-height: min(620px, calc(100dvh - 120px)); }
  }
  /* Keep Create-post visible on common laptop widths (sidebar + ~1280 window). */
  @media (max-width: 1360px) {
    .pb-studio .pb-bar-controls { flex-wrap: wrap; row-gap: 8px; }
    .pb-studio .pb-bar-extras { flex-wrap: wrap; row-gap: 6px; }
  }
  @media (max-width: 860px) and (min-width: 769px) {
    .pb-studio .canvas { min-height: min(540px, calc(100dvh - 120px)); }
    .pb-studio .pb-bar-controls { flex-wrap: wrap; row-gap: 8px; }
    .pb-studio .pb-ref-chip span, .pb-studio .pb-plat-cue span { display: none; }
    .pb-studio .pb-ref-chip { padding: 0 9px; }
  }
  /* Phone: bottom tab bar (AppMobileNav) */
  @media (max-width: 768px) {
    .pb-studio .app {
      padding: 8px 8px calc(72px + env(safe-area-inset-bottom, 0px));
    }
    .pb-studio .canvas { min-height: min(420px, calc(100dvh - 160px)); }
    .pb-studio .frame-wrap {
      width: 64%;
      max-width: 280px;
      top: calc(var(--studio-top-chrome) + (100% - var(--studio-top-chrome) - var(--studio-prompt-reserve)) / 2);
      transform: translate(-50%, -50%);
    }
    .pb-studio .prompt-bar { width: 92%; bottom: 18px; padding: 10px 10px 9px 14px; }
    .pb-studio .pb-bar-controls { flex-wrap: wrap; row-gap: 8px; }
    .pb-studio .pb-ref-chip span, .pb-studio .pb-dim-chip, .pb-studio .pb-plat-cue span { display: none; }
    .pb-studio .pb-ref-chip { padding: 0 9px; }
    .pb-studio .prompt-bar textarea.pb-bar-textarea { font-size: var(--text-body); }
    .pb-studio .canvas-top { top: 14px; left: 14px; right: 14px; }
    .pb-studio .dim-chip { padding: 8px 12px; font-size: var(--text-caption); }
  }
  @media (max-width: 380px) { .pb-studio .frame-wrap { width: 72%; } }

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

  /* composer floats in on entry — frosted, clear of the image band */
  .pb-studio .prompt-bar {
    bottom: 28px;
    left: 0;
    right: 0;
    margin-inline: auto;
    /* GSAP owns vertical y only — horizontal center is CSS (left/right/margin). */
    transform: none;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(28px) saturate(1.65);
    -webkit-backdrop-filter: blur(28px) saturate(1.65);
    border: 1px solid rgba(255, 255, 255, 0.78);
    transition: box-shadow var(--duration-moderate) var(--ease-standard), background 0.2s ease;
    animation: pbsBarIn 0.85s cubic-bezier(0.22, 1.12, 0.36, 1) 0.12s both;
    box-shadow:
      0 22px 56px -26px rgba(20, 20, 40, 0.42),
      0 0 0 1px rgba(26, 26, 46, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
  }
  .pb-studio .prompt-bar.is-hero {
    /* Visual hint only — vertical position is GSAP y from bottom resting spot */
    box-shadow:
      0 28px 64px -24px rgba(20, 20, 40, 0.48),
      0 0 0 1px rgba(26, 26, 46, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
  }
  .pb-studio .prompt-bar.is-grown {
    top: 50%;
    bottom: auto;
    left: 0;
    right: 0;
    margin-inline: auto;
    transform: translateY(-50%);
    width: min(440px, 92%);
    max-width: calc(100% - 48px);
    animation: none;
    background: rgba(255, 255, 255, 0.62);
  }
  .pb-studio .edit-rail {
    top: calc(50% - 36px);
    transform: translateY(-50%);
    max-height: calc(100% - 220px);
    overflow-y: auto;
    overflow-x: visible;
    scrollbar-width: none;
    padding: 6px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid rgba(255, 255, 255, 0.65);
    box-shadow: 0 12px 32px -20px rgba(20, 20, 40, 0.4);
  }
  .pb-studio .edit-rail::-webkit-scrollbar { display: none; }
  @keyframes pbsBarIn {
    from { opacity: 0; filter: blur(10px); }
    to { opacity: 1; filter: blur(0); }
  }

  .pb-studio .preview-toggle {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .pb-studio .top-actions .preview-toggle {
    padding: 7px 12px;
    font-size: 12.5px;
  }
  .pb-studio .studio-mode-toggle {
    flex-shrink: 0;
  }

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
    top: calc(72px + (100% - 72px - 208px) / 2);
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
    border-radius: 0;
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

  /* R4: the white-room overrides above out-cascade earlier mobile rules —
     re-assert phone layout here, last. Clears AppMobileNav (~72px). */
  @media (max-width: 768px) {
    .pb-studio .prompt-bar {
      left: 0;
      right: 0;
      margin-inline: auto;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      width: min(94%, calc(100% - 20px));
      max-width: calc(100% - 20px);
      z-index: 25;
    }
    .pb-studio .pb-bar-controls {
      flex-wrap: wrap;
      row-gap: 8px;
      justify-content: flex-start;
    }
    .pb-studio .pb-bar-extras {
      flex-wrap: wrap;
      min-width: 0;
      flex: 1 1 auto;
    }
    .pb-studio .pb-generate,
    .pb-studio .pb-generate-primary {
      flex: 0 0 auto;
      margin-left: auto;
    }
    /* Edit tools → horizontal tray above the prompt (clears tab bar). */
    .pb-studio .tool-rail,
    .pb-studio .tool-rail.edit-rail {
      left: 50%;
      right: auto;
      top: auto;
      bottom: calc(168px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      max-width: calc(100% - 16px);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      gap: 2px;
      padding: 5px 7px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.75);
      box-shadow: 0 14px 36px -18px rgba(20, 20, 40, 0.5);
      z-index: 24;
    }
    .pb-studio .tool-rail::-webkit-scrollbar { display: none; }
    .pb-studio .tool-rail .rail-ico {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .pb-studio .tool-rail .rail-div {
      width: 1px;
      height: 22px;
      margin: 0 4px;
    }
    .pb-studio .tool-rail .rail-pop,
    .pb-studio .tool-rail.edit-rail .rail-pop {
      left: 50%;
      right: auto;
      top: auto;
      bottom: calc(100% + 10px);
      transform: translateX(-50%);
      min-width: 168px;
    }
    .pb-studio .frame-wrap {
      --studio-top-chrome: 64px;
      --studio-prompt-reserve: calc(220px + env(safe-area-inset-bottom, 0px));
      max-width: min(78%, 280px);
    }
    .pb-studio .canvas:has(.edit-rail) .frame-wrap {
      --studio-prompt-reserve: calc(248px + env(safe-area-inset-bottom, 0px));
    }
    .pb-studio .canvas:has(.prompt-bar.is-chat) .frame-wrap:not(.as-post):not(.is-chat-result),
    .pb-studio .canvas:has(.studio-chat-thread) .frame-wrap:not(.as-post):not(.is-chat-result) {
      --studio-top-chrome: max(100px, 14vh);
      --studio-prompt-reserve: calc(260px + env(safe-area-inset-bottom, 0px));
      max-width: min(170px, 42vw);
      max-height: min(26vh, 220px, calc(100% - var(--studio-top-chrome) - var(--studio-prompt-reserve)));
      top: calc(var(--studio-top-chrome) + (100% - var(--studio-top-chrome) - var(--studio-prompt-reserve)) * 0.34);
    }
    .pb-studio .canvas:has(.prompt-bar.is-chat):has(.canvas-top.has-actions) .frame-wrap:not(.as-post):not(.is-chat-result),
    .pb-studio .canvas:has(.studio-chat-thread):has(.canvas-top.has-actions) .frame-wrap:not(.as-post):not(.is-chat-result) {
      --studio-top-chrome: max(120px, 16vh);
    }
    .pb-studio .canvas-top {
      top: max(10px, env(safe-area-inset-top, 0px));
      left: 10px;
      right: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pb-studio .canvas-top .top-left {
      flex: 1 1 auto;
      padding-right: 96px; /* room for absolute toggles */
    }
    .pb-studio .canvas-top .top-actions {
      justify-content: flex-start;
      width: 100%;
    }
    .pb-studio .canvas-top .top-toggles {
      position: absolute;
      top: 0;
      right: 0;
      margin-left: 0;
    }
    .pb-studio .canvas:has(.canvas-top.has-actions) .frame-wrap {
      --studio-top-chrome: 120px;
    }
    .pb-studio .top-toggles button {
      min-width: 44px;
      min-height: 44px;
    }
    .pb-studio .pb-ref-chip,
    .pb-studio .pb-model-chip,
    .pb-studio .pb-dim-chip,
    .pb-studio .pb-generate {
      min-height: 44px;
    }
    .pb-studio .canvas {
      min-height: min(380px, calc(100dvh - 200px));
    }
  }

  /* ===== Chat layout v3 (class on canvas — no :has race) =====
     buttons → chat+stage → composer. Nothing absolute in the middle band. */
  .pb-studio .canvas.is-chat-layout {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  .pb-studio .canvas.is-chat-layout .canvas-top {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    flex: 0 0 auto;
    padding: 10px 12px 6px;
    z-index: 30;
  }
  .pb-studio .canvas.is-chat-layout .studio-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 2;
    overflow: hidden;
  }
  .pb-studio .canvas.is-chat-layout .studio-chat-thread {
    position: relative !important;
    inset: auto !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    flex: 0 1 auto;
    max-height: min(14vh, 96px) !important;
    height: auto !important;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 4px 16px 4px;
    z-index: 3;
    pointer-events: none;
  }
  .pb-studio .canvas.is-chat-layout:has(.studio-coverflow) .studio-chat-thread,
  .pb-studio .canvas.is-chat-layout:has(.studio-result-stage) .studio-chat-thread,
  .pb-studio .canvas.is-chat-layout:has(.frame-wrap.as-post) .studio-chat-thread {
    max-height: min(10vh, 72px) !important;
  }
  .pb-studio .canvas.is-chat-layout .studio-chat-thread .studio-chat-inner,
  .pb-studio .canvas.is-chat-layout .studio-chat-thread .studio-chat-bubble,
  .pb-studio .canvas.is-chat-layout .studio-chat-thread .studio-chat-image-card,
  .pb-studio .canvas.is-chat-layout .studio-chat-thread .studio-chat-msg-asst {
    pointer-events: auto;
  }
  .pb-studio .canvas.is-chat-layout .studio-stage {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden !important;
    padding: 8px 16px;
    z-index: 2;
  }
  .pb-studio .canvas.is-chat-layout:has(.edit-rail) .studio-stage {
    padding-right: 72px;
    padding-left: 16px;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow {
    position: relative !important;
    inset: auto !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    width: 100%;
    height: 100%;
    max-height: 100%;
    flex: 1 1 auto;
    min-height: 0;
    z-index: 2;
    pointer-events: none;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow-track {
    width: min(720px, 100%);
    height: 100% !important;
    max-height: 100%;
    overflow: hidden;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide img,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-skeleton {
    width: min(200px, 24vw, 36vh) !important;
    max-height: min(42vh, calc(100% - 8px), 320px) !important;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.selected img,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.selected .studio-coverflow-skeleton {
    width: min(280px, 32vw, 48vh) !important;
    max-height: min(52vh, calc(100% - 8px), 380px) !important;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.prev img,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.next img,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.prev .studio-coverflow-skeleton,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.next .studio-coverflow-skeleton {
    width: min(180px, 20vw, 32vh) !important;
    max-height: min(38vh, calc(100% - 8px), 280px) !important;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.prevLeftSecond,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.nextRightSecond {
    opacity: 0.5;
  }
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.prevLeftSecond img,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.nextRightSecond img,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.prevLeftSecond .studio-coverflow-skeleton,
  .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.nextRightSecond .studio-coverflow-skeleton {
    width: min(120px, 14vw, 22vh) !important;
    max-height: min(26vh, calc(100% - 8px), 180px) !important;
  }
  .pb-studio .canvas.is-chat-layout .studio-result-stage {
    position: relative !important;
    inset: auto !important;
    width: 100%;
    height: 100%;
    max-height: 100%;
    z-index: 2;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pb-studio .canvas.is-chat-layout .studio-result-stage img {
    max-width: min(320px, 48%, 42vh) !important;
    max-height: min(400px, 92%, 56vh) !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain;
  }
  .pb-studio .canvas.is-chat-layout .frame-wrap:not(.as-post),
  .pb-studio .canvas.is-chat-layout .frame-wrap.as-post {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
    inset: auto !important;
    margin: 0 auto !important;
    z-index: 2 !important;
    max-height: 100% !important;
  }
  .pb-studio .canvas.is-chat-layout .frame-wrap.as-post {
    width: min(320px, 100%) !important;
    max-width: min(340px, calc(100% - 8px)) !important;
    overflow: hidden;
  }
  .pb-studio .canvas.is-chat-layout .frame-wrap.as-post .igpv-media,
  .pb-studio .canvas.is-chat-layout .frame-wrap.as-post .fbpv-media {
    max-height: min(42vh, 320px) !important;
  }
  .pb-studio .canvas.is-chat-layout .frame-wrap.is-generating:not(.as-post)::before {
    display: none;
  }
  .pb-studio .canvas.is-chat-layout .frame-wrap.is-chat-result {
    position: absolute !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 1px !important;
    height: 1px !important;
    overflow: hidden !important;
  }
  .pb-studio .canvas.is-chat-layout .prompt-bar.is-chat {
    position: relative !important;
    bottom: auto !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
    flex: 0 0 auto !important;
    z-index: 40 !important;
    max-height: min(32vh, 240px);
    background: rgba(255, 255, 255, 0.92) !important;
  }
  .pb-studio .canvas.is-chat-layout .studio-error {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    flex: 0 0 auto;
    width: min(680px, calc(100% - 24px));
    margin: 0 auto 6px;
    padding: 8px 12px;
    z-index: 35;
  }
  .pb-studio .canvas.is-chat-layout .studio-error p {
    font-size: 12.5px;
    line-height: 1.35;
  }
  @media (max-width: 768px) {
    .pb-studio .canvas.is-chat-layout .studio-chat-thread {
      max-height: min(12vh, 80px) !important;
    }
    .pb-studio .canvas.is-chat-layout:has(.edit-rail) .studio-stage {
      padding-right: 16px;
      padding-bottom: 64px;
    }
    .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.selected img,
    .pb-studio .canvas.is-chat-layout .studio-coverflow-slide.selected .studio-coverflow-skeleton {
      width: min(220px, 48vw) !important;
      max-height: min(40vh, 280px) !important;
    }
    .pb-studio .canvas.is-chat-layout .prompt-bar.is-chat {
      margin-bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
      max-height: min(30vh, 220px);
    }
  }
    `}</style>
  );
}
