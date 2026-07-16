"use client";

// Posterboy dashboard home — warm/light frosted card system (adapted from the
// approved mockup). Scoped under .pb-home2.
export function DashboardHomeStyles() {
  return (
    <style>{`
    .pb-home2 {
      --ink: #1c1c1e;
      --ink-soft: #76767e;
      --line: rgba(20,20,30,0.07);
      --card: rgba(255,255,255,0.72);
      --card-solid: #ffffff;
      /* "accent" is posterboy red (token names kept for brevity) */
      --green: #ee2532;
      --green-deep: #c81e2a;
      --accent-soft: rgba(238,37,50,0.12);
      --red: #ee2532;
      height: 100%; min-height: 0; overflow-y: auto;
      color: var(--ink);
      font-family: var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      background:
        radial-gradient(1100px 520px at 88% -8%, rgba(238,37,50,0.06), transparent 60%),
        linear-gradient(165deg, #eef0f2 0%, #e9ebee 55%, #edeff1 100%);
    }
    .pb-home2 * { box-sizing: border-box; }

    .home2 {
      display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 24px;
      width: 100%; max-width: none; margin: 0 auto; padding: 24px; min-height: 100%;
    }
    /* Comfortable reading width on mid desktops; open up on XL+ */
    @media (min-width: 981px) and (max-width: 1439px) {
      .home2 { max-width: 1440px; }
    }
    @media (min-width: 1440px) {
      .home2 { max-width: none; padding-left: 20px; padding-right: 20px; gap: 20px; }
    }
    @media (min-width: 1800px) {
      .home2 { padding-left: 28px; padding-right: 28px; gap: 24px; }
    }
    /* Tablet: slim icon rail beside content */
    @media (max-width: 980px) and (min-width: 769px) {
      .home2 { grid-template-columns: 52px minmax(0, 1fr); gap: 14px; padding: 14px; }
    }
    /* Phone: full-width content + bottom tab bar (AppMobileNav) */
    @media (max-width: 768px) {
      .home2 {
        grid-template-columns: minmax(0, 1fr);
        gap: 0;
        padding: 12px 12px calc(72px + env(safe-area-inset-bottom, 0px));
      }
      .pb-side { display: none !important; }
    }

    /* ---------- Main ---------- */
    .main2 { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

    /* Fixed app-pane (calendar): fits the viewport on tablet landscape + desktop.
       Phones stay scrollable (see max-width: 1023px rules below). */
    @media (min-width: 1024px) {
      .pb-home2--fixed { overflow: hidden; height: 100%; }
      .pb-home2--fixed .home2 {
        height: 100%; min-height: 0; max-height: 100%;
        max-width: none; width: 100%;
        padding-top: 16px; padding-bottom: 16px;
      }
      .pb-home2--fixed .main2 {
        min-height: 0; height: 100%; overflow: hidden;
        display: flex; flex-direction: column; gap: 12px;
      }
      .pb-home2--fixed .main2 > * {
        flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
      }
      .pb-home2--fixed .pb-app {
        flex: 1; min-height: 0; height: 100%;
        display: flex; flex-direction: column;
        overflow: hidden; padding: 0;
      }
      .pb-home2--fixed .pb-app-header { margin-bottom: 0 !important; flex-shrink: 0; }
      .pb-home2--fixed .pb-app-header h1 { font-size: 1.5rem !important; }
      .pb-home2--fixed .pb-cal-grid {
        flex: 1; min-height: 0;
        grid-template-rows: minmax(0, 1fr);
        overflow: hidden;
      }
      .pb-home2--fixed .pb-cal-grid > * {
        min-height: 0; height: 100%; overflow: hidden;
      }
      .pb-home2--fixed .pb-cal-month {
        height: 100%; min-height: 0;
        display: flex; flex-direction: column;
      }
      .pb-home2--fixed .pb-cal-month-grid {
        flex: 1; min-height: 0;
        grid-template-rows: repeat(6, minmax(0, 1fr));
      }
      .pb-home2--fixed .pb-cal-month-grid > * { min-height: 0; }
    }

    /* Phone / tablet portrait: page scrolls; composer preview is height-capped in JS/Tailwind. */
    @media (max-width: 1023px) {
      .pb-home2--fixed { overflow-y: auto; height: 100%; -webkit-overflow-scrolling: touch; }
      .pb-home2--fixed .pb-app { padding-bottom: 0.5rem; }
      .pb-home2--fixed .pb-cal-grid { grid-template-rows: none; }
      .pb-home2--fixed .pb-cal-grid > * { height: auto; min-height: 0; overflow: visible; }
    }

    /* Utility bar */
    .topbar2 { position: relative; z-index: 60; display: flex; justify-content: flex-end; align-items: center; gap: 12px; height: 6px; margin-bottom: 6px; }
    .topbar2 .ut {
      position: relative; width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.65);
      color: var(--ink-soft); cursor: pointer; text-decoration: none;
      box-shadow: 0 10px 26px -18px rgba(20,20,40,0.5); transition: transform var(--duration-standard) var(--ease-spring), color var(--duration-fast) var(--ease-standard);
    }
    .topbar2 .ut:hover { transform: translateY(-1px); color: var(--ink); }
    .topbar2 .ut .dot { position: absolute; top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 99px; background: #ff3b30; border: 1.5px solid #fff; }
    .topbar2 .ut.avatar { width: 42px; height: 42px; padding: 0; overflow: hidden; border: 2px solid #fff; }
    .topbar2 .ut.avatar img { width: 100%; height: 100%; object-fit: cover; }

    /* Notifications dropdown */
    .topbar2 .notif { position: relative; }
    .topbar2 .notif.open { z-index: 50; }
    .topbar2 .ut .dot.count {
      top: 3px; right: 3px; width: auto; height: 16px; min-width: 16px; padding: 0 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--text-eyebrow); font-weight: 700; line-height: var(--leading-tight); color: #fff;
      background: #ee2532; border: 1.5px solid #fff; border-radius: 99px;
      transition: transform var(--duration-moderate) var(--ease-spring);
    }
    .notif.open .ut .dot.count { transform: scale(0); }
    .notif-panel {
      position: absolute; top: calc(100% + 12px); right: 0; z-index: 50;
      width: 300px; max-width: calc(100vw - 32px);
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(22px) saturate(1.5); -webkit-backdrop-filter: blur(22px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.7); border-radius: 18px;
      box-shadow: 0 30px 70px -28px rgba(20,20,40,0.5);
      padding: 14px; transform-origin: top right;
      opacity: 0; transform: translateY(-8px) scale(.97); pointer-events: none;
      transition: var(--transition-enter);
    }
    .notif.open .notif-panel { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .notif-head {
      font-size: var(--text-label); font-weight: 700; text-transform: uppercase; letter-spacing: var(--tracking-label);
      color: var(--ink-soft); padding: 2px 6px 10px;
    }
    .notif-empty { margin: 0; padding: 4px 6px 8px; font-size: var(--text-body-sm); color: var(--ink-soft); }
    .notif-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .notif-item {
      display: flex; gap: 10px; padding: 11px 12px; border-radius: 12px;
      background: rgba(255,255,255,0.6); border: 1px solid rgba(20,20,40,0.05);
      opacity: 0; transform: translateY(8px);
      transition: var(--transition-enter), background-color var(--duration-fast) var(--ease-standard);
    }
    .notif.open .notif-item { opacity: 1; transform: translateY(0); transition-delay: calc(var(--i) * 70ms + 120ms); }
    .notif-item:hover { background: rgba(255,255,255,0.95); }
    .notif-item .notif-dot { flex: none; width: 7px; height: 7px; margin-top: 6px; border-radius: 99px; background: #ee2532; }
    .notif-item p { margin: 0; font-size: var(--text-body-sm); line-height: var(--leading-body); color: var(--ink); }
    .notif-item strong { font-weight: 600; }
    .notif-item .notif-time { display: block; margin-top: 3px; font-size: var(--text-label); color: var(--ink-soft); }
    @media (prefers-reduced-motion: reduce) {
      .notif-panel, .notif-item, .topbar2 .ut .dot.count { transition: none; }
    }

    /* ---------- First-run get-started banner ---------- */
    .firstrun {
      display: flex; align-items: center; justify-content: space-between; gap: 24px;
      flex-wrap: wrap; margin-bottom: 18px; padding: 22px 26px;
      border-radius: 22px; border: 1px solid var(--line);
      background: var(--card); backdrop-filter: blur(22px) saturate(1.5);
      -webkit-backdrop-filter: blur(22px) saturate(1.5);
      box-shadow: 0 18px 44px -28px rgba(20,20,40,0.4);
    }
    .firstrun-copy { min-width: 0; }
    .firstrun-eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--green);
    }
    .firstrun-title { margin: 0 0 6px; font-size: 22px; font-weight: 600; color: var(--ink); line-height: 1.15; }
    .firstrun-sub { margin: 0; max-width: 52ch; font-size: 14px; line-height: 1.5; color: var(--ink-soft); }
    .firstrun-cta {
      flex: none; display: inline-flex; align-items: center; padding: 12px 22px;
      border-radius: 12px; background: var(--green); color: #fff;
      font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap;
      box-shadow: 0 12px 28px -12px rgba(200,30,42,0.6);
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .firstrun-cta:hover { transform: translateY(-1px); background: #c81e2a; }
    @media (max-width: 560px) { .firstrun-cta { width: 100%; justify-content: center; } }

    /* ---------- Hero coverflow (full-width, light) ---------- */
    .hero-cf { position: relative; }
    .hero-cf .swiper { width: 100%; padding: 10px 0 34px; }
    .hero-cf .swiper-slide { width: min(560px, 72vw); }
    .hero-cf .cf-card {
      position: relative; height: 300px; border-radius: 24px; overflow: hidden;
      background: var(--card);
      border: 1px solid rgba(255,255,255,0.7);
      box-shadow: 0 30px 70px -42px rgba(20,20,40,0.5), inset 0 1px 0 rgba(255,255,255,0.7);
      isolation: isolate;
    }
    .hero-cf .cf-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
    .hero-cf .cf-scrim { position: absolute; inset: 0; z-index: 1; background: linear-gradient(100deg, rgba(8,12,20,0.66) 0%, rgba(8,12,20,0.32) 46%, rgba(8,12,20,0) 72%); }
    /* typographic holiday cards — warm-light palettes, no stock photos */
    .hero-cf .cf-grad-0 { background: linear-gradient(135deg, #fff4e6 0%, #ffd9b3 100%); }
    .hero-cf .cf-grad-1 { background: linear-gradient(135deg, #fdeeee 0%, #f7c2c8 100%); }
    .hero-cf .cf-grad-2 { background: linear-gradient(135deg, #f3f1ec 0%, #ddd4c3 100%); }
    .hero-cf .cf-grad-3 { background: linear-gradient(135deg, #eef2ee 0%, #c9dccb 100%); }
    .hero-cf .cf-body { position: absolute; z-index: 2; left: 34px; bottom: 26px; right: 34px; }
    .hero-cf .cf-title {
      font-size: var(--text-stat); line-height: var(--leading-tight); font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
      color: var(--ink);
    }
    .hero-cf .cf-img ~ .cf-body .cf-title { color: #fff; text-shadow: 0 2px 26px rgba(0,0,0,0.45); }
    .hero-cf .cf-date { margin-top: 6px; font-size: var(--text-body); font-weight: 500; color: #4a4a52; }
    .hero-cf .cf-img ~ .cf-body .cf-date { color: rgba(255,255,255,0.88); }
    .hero-cf .cf-btn {
      display: inline-block; margin-top: 14px; padding: 10px 22px; border-radius: 99px;
      background: #c81e2a; color: #fff; font-size: var(--text-body-sm); font-weight: 600; text-decoration: none;
      box-shadow: 0 12px 30px -14px rgba(200,30,42,0.6); transition: var(--transition-interactive);
    }
    .hero-cf .cf-btn:hover { transform: translateY(-2px); background: #b01a25; }
    .hero-cf .swiper-pagination-bullet { background: rgba(28,28,30,0.55); opacity: 1; transition: opacity var(--duration-moderate) var(--ease-standard), width var(--duration-moderate) var(--ease-standard), background-color var(--duration-moderate) var(--ease-standard), border-radius var(--duration-moderate) var(--ease-standard); }
    .hero-cf .swiper-pagination-bullet-active { width: 20px; border-radius: 99px; background: #c81e2a; }
    .hero-cf .slabel { position: absolute; z-index: 5; right: 14px; top: 18px; font-size: var(--text-eyebrow); letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-soft); background: rgba(255,255,255,0.8); padding: 6px 12px; border-radius: 99px; backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.7); }
    .hero-cf .hero-pause {
      position: absolute; z-index: 5; right: 14px; top: 48px;
      font-size: var(--text-label); font-weight: 600; letter-spacing: 0.04em;
      color: var(--ink); background: rgba(255,255,255,0.85);
      padding: 6px 12px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.7);
      backdrop-filter: blur(6px); cursor: pointer; box-shadow: 0 6px 18px -10px rgba(20,20,40,0.4);
    }
    .hero-cf .hero-pause:disabled { opacity: 0.65; cursor: default; }
    @media (prefers-reduced-motion: reduce) {
      .hero-cf .swiper-wrapper { transition-duration: 0ms !important; }
    }

    /* Shortcuts — horizontal strip under the carousel */
    .shortcuts2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .shortcuts2 .scut { padding-top: 18px; padding-bottom: 18px; }
    @media (max-width: 560px) { .shortcuts2 { grid-template-columns: 1fr; } }
    .scut {
      display: flex; align-items: center; gap: 16px; padding: 0 22px; border-radius: 22px;
      background: var(--card); backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.65); text-decoration: none; color: var(--ink);
      box-shadow: 0 18px 44px -32px rgba(20,20,40,0.45), inset 0 1px 0 rgba(255,255,255,0.7);
      transition: var(--transition-lift);
    }
    .scut:hover { transform: translateY(-3px); box-shadow: 0 26px 52px -30px rgba(238,37,50,0.35), inset 0 1px 0 rgba(255,255,255,0.8); }
    .scut .ic { width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #c81e2a; color: #fff; box-shadow: 0 8px 18px -10px rgba(200,30,42,0.6); }
    .scut .tx { display: flex; flex-direction: column; gap: 2px; }
    .scut .tx b { font-size: var(--text-ui); font-weight: 600; letter-spacing: .3px; }
    .scut .tx small { font-size: var(--text-caption); color: var(--ink-soft); }

    /* ---------- Cards (generic) ---------- */
    .mod {
      border-radius: 24px; padding: 20px; background: var(--card);
      backdrop-filter: blur(22px) saturate(1.5); -webkit-backdrop-filter: blur(22px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.62);
      box-shadow: 0 22px 54px -38px rgba(20,20,40,0.45), inset 0 1px 0 rgba(255,255,255,0.65);
      display: flex; flex-direction: column;
    }
    .mhead { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 2px 10px; margin-bottom: 16px; }
    
    /* Your Week rail */
    .weekrail { display: flex; gap: 6px; }
    .wday {
      flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center;
      gap: 7px; padding: 12px 0 10px; border-radius: 14px; text-decoration: none;
      border: 1px solid transparent;
      transition: var(--transition-interactive);
    }
    .wday .wd-l { font-size: var(--text-eyebrow); font-weight: 700; letter-spacing: var(--tracking-label, 0.1em); color: var(--ink-soft); }
    .wday.today { border-color: rgba(238,37,50,0.25); background: rgba(238,37,50,0.04); }
    .wday.filled .wd-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--red); box-shadow: 0 0 0 3px rgba(238,37,50,0.14); }
    .wday.filled:hover { transform: translateY(-2px); background: rgba(255,255,255,0.8); border-color: rgba(20,20,40,0.08); }
    .wday.empty .wd-plus { font-size: var(--text-ui); line-height: 9px; height: 9px; color: rgba(20,20,30,0.28); font-weight: 400; transition: color var(--duration-fast, 120ms) var(--ease-standard, ease); }
    .wday.empty:hover { transform: translateY(-2px); background: rgba(255,255,255,0.85); border-color: rgba(238,37,50,0.3); }
    .wday.empty:hover .wd-plus { color: var(--green-deep, #c81e2a); }
    .wday.past { opacity: 0.45; }
    .wday.past .wd-e { font-size: var(--text-body-sm); line-height: 9px; height: 9px; color: var(--ink-soft); }
    .wk-suggest {
      display: inline-flex; align-items: center; gap: 7px; margin-top: 14px;
      font-size: var(--text-caption, 12.5px); font-weight: 600; color: var(--green-deep, #c81e2a);
      text-decoration: none; transition: var(--transition-color);
    }
    .wk-suggest:hover { color: var(--red, #ee2532); }

    .mtitle2 {
      margin: 0; min-width: 0;
      font-size: var(--text-eyebrow, 10.5px); font-weight: 700;
      letter-spacing: var(--tracking-eyebrow, 0.14em); text-transform: uppercase;
      color: var(--ink-soft);
    }
    .viewall { font-size: var(--text-caption); color: var(--green-deep); font-weight: 600; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
    .viewall:hover { text-decoration: underline; }
    .period { font-size: var(--text-caption); color: var(--ink-soft); display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; flex-shrink: 0; }
    .ghostbtn { border-radius: 99px; border: 1px solid var(--green); background: var(--accent-soft); color: var(--green-deep); padding: 9px 20px; font-size: var(--text-body); font-weight: 600; cursor: pointer; }

    /* Middle row — minmax(0,1fr) keeps cards in lane; never let transforms
       escape the grid track (GSAP scale used to overlap Next Up onto Posts). */
    .modules2 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
      align-items: stretch;
    }
    @media (max-width: 1080px) {
      .modules2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .modules2 { grid-template-columns: minmax(0, 1fr); }
    }
    .modules2 .mod {
      min-height: 230px;
      min-width: 0;
      width: 100%;
      max-width: 100%;
      position: relative;
      z-index: 0;
      box-sizing: border-box;
    }

    /* Upcoming posts */
    .uplist { display: flex; flex-direction: column; gap: 4px; }
    .uprow { display: flex; align-items: center; gap: 12px; padding: 7px 0; }
    .upthumb { width: 42px; height: 42px; border-radius: 11px; background-size: cover; background-position: center; flex-shrink: 0; background-color: #e5e7eb; }
    .upinfo { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .upt { font-size: var(--text-body); font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .upd { font-size: var(--text-label); color: var(--ink-soft); }
    .upplat { flex-shrink: 0; display: flex; align-items: center; }

    /* Next up (third module when weather is unavailable) */
    .next2 { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    .reach2 { position: relative; overflow: hidden; min-width: 0; }
    .up2 { min-width: 0; overflow: hidden; }
    .bignum { font-size: clamp(40px, 4.4vw, 56px); font-weight: 300; letter-spacing: var(--tracking-display, -0.04em); color: var(--ink); line-height: var(--leading-tight); margin: 6px 0 2px; }
    .delta { margin-top: 8px; font-size: var(--text-caption); font-weight: 600; }
    /* positive-metric green (convention: up = green), independent of brand-red accent */
    .delta.up { color: #157a38; }
    .delta.down { color: var(--red); }
    .delta span { color: var(--ink-soft); font-weight: 500; }
    .reach2 .spark { position: absolute; left: 0; right: 0; bottom: 0; height: 74px; }
    .reach2 .spark svg { width: 100%; height: 100%; display: block; }

    /* Weather */
    .wx2 .wtop { display: flex; align-items: flex-start; justify-content: space-between; flex: 1; }
    .wx2 .temp { font-size: 52px; font-weight: 800; line-height: var(--leading-tight); letter-spacing: -2px; color: var(--ink); }
    .wx2 .temp .deg { font-size: 24px; vertical-align: top; font-weight: 600; color: var(--ink-soft); }
    .wx2 .wicon svg { width: 58px; height: 58px; }
    .wx2 .cond { margin-top: 8px; font-size: var(--text-body); font-weight: 600; color: var(--ink); }
    .wx2 .loc { font-size: var(--text-caption); color: var(--ink-soft); }
    .wx2 .wfoot { margin-top: auto; padding-top: 14px; display: flex; align-items: center; gap: 16px; font-size: var(--text-caption); color: var(--ink-soft); }
    .wx2 .wfoot b { color: var(--ink); font-weight: 600; }
    .wx2 .wlink { margin-left: auto; color: var(--green-deep); font-weight: 600; text-decoration: none; font-size: var(--text-caption); }

    .nextcard {
      display: flex; align-items: center; gap: 12px; padding: 10px 0 4px;
      text-decoration: none; color: inherit; border-radius: 14px;
      transition: var(--transition-interactive);
    }
    .nextcard:hover { background: rgba(255,255,255,0.55); }
    .nextthumb {
      width: 52px; height: 52px; border-radius: 12px; flex-shrink: 0;
      background-size: cover; background-position: center; background-color: #e5e7eb;
    }
    .nextthumb-empty { background: linear-gradient(135deg, #eef0f2, #e3e6ea); }
    .nextbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .nextcopy {
      font-size: var(--text-body); font-weight: 600; color: var(--ink);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nextmeta { font-size: var(--text-label); color: var(--ink-soft); }
    .nextplat { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .nextempty {
      flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px;
      font-size: var(--text-body-sm); color: var(--ink-soft); padding: 8px 0;
    }
    .nextfoot {
      margin-top: auto; padding-top: 12px; font-size: var(--text-caption); color: var(--ink-soft);
    }
    .nextfoot b { font-size: var(--text-stat, 26px); font-weight: 300; color: var(--ink); margin-right: 6px; }

    /* ---------- Bottom row ---------- */
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 880px) { .row2 { grid-template-columns: 1fr; } }
    .row2 .mod { min-height: 158px; }

    /* Recent media */
    .mediastrip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }
    @media (max-width: 720px) {
      .mediastrip { grid-template-columns: repeat(2, 1fr); }
    }
    .mediathumb { border-radius: 14px; background-size: cover; background-position: center; background-color: #e5e7eb; transition: transform var(--duration-standard) var(--ease-spring); }
    .mediathumb:hover { transform: scale(1.04); }

    /* The coverflow-first home scrolls naturally (the old one-screen lock
       flexed the retired .top2 hero grid). Long in-card lists still scroll
       internally so no content is lost. */
    @media (min-width: 1081px) and (min-height: 720px) {
      .modules2 .mod .uplist { min-height: 0; overflow-y: auto; }
    }

    /* Workspace stats (real counts) */
    .audstats { display: flex; align-items: center; gap: 28px; flex: 1; }
    .audstats > div { display: flex; flex-direction: column; gap: 2px; }
    .audstats b { font-size: var(--text-stat, 26px); font-weight: 300; letter-spacing: var(--tracking-display, -0.04em); color: var(--ink); line-height: var(--leading-tight); }
    .audstats small { font-size: var(--text-label); color: var(--ink-soft); }

    /* Audience */
    .audrow { display: flex; align-items: center; gap: 12px; flex: 1; }
    .aud { width: 52px; height: 52px; border-radius: 50%; padding: 2.5px; background: var(--ring, #34c759); display: inline-block; }
    .aud img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #fff; display: block; }
    .audadd { width: 44px; height: 44px; border-radius: 50%; border: 1.5px dashed rgba(20,20,40,0.2); background: rgba(255,255,255,0.5); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--transition-color); }
    .audadd:hover { border-color: var(--green); color: var(--green-deep); }

    .pb-home2 .anim { will-change: transform; }

    `}</style>
  );
}
