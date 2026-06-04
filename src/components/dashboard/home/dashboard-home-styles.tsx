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
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      background:
        radial-gradient(1100px 520px at 88% -8%, rgba(238,37,50,0.06), transparent 60%),
        linear-gradient(165deg, #eef0f2 0%, #e9ebee 55%, #edeff1 100%);
    }
    .pb-home2 * { box-sizing: border-box; }

    .home2 {
      display: grid; grid-template-columns: 250px 1fr; gap: 22px;
      max-width: 1520px; margin: 0 auto; padding: 22px; min-height: 100%;
    }
    @media (max-width: 980px) { .home2 { grid-template-columns: 1fr; } }

    /* ---------- Sidebar ---------- */
    .side2 {
      position: sticky; top: 22px; align-self: start; height: calc(100vh - 44px);
      display: flex; flex-direction: column; padding: 26px 20px;
      border-radius: 28px; background: rgba(255,255,255,0.78);
      backdrop-filter: blur(26px) saturate(1.5); -webkit-backdrop-filter: blur(26px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.65);
      box-shadow: 0 24px 60px -38px rgba(20,20,40,0.4), inset 0 1px 0 rgba(255,255,255,0.7);
    }
    @media (max-width: 980px) { .side2 { height: auto; position: relative; top: 0; } }
    .side2 .logo {
      font-family: var(--font-playfair, var(--font-instrument-serif, Georgia, serif));
      font-size: 30px; font-weight: 500; letter-spacing: -0.5px; color: var(--ink);
      text-decoration: none; margin-bottom: 34px; display: inline-flex; align-items: baseline; line-height: 1;
    }
    .side2 .logo em { font-style: italic; font-weight: 500; }
    .side2 .logo .tm { font-style: normal; font-size: 0.3em; font-weight: 500; transform: translateY(-0.9em); margin-left: 2px; }
    .side2 nav { display: flex; flex-direction: column; gap: 3px; }
    .side2 nav .grp-gap { height: 22px; margin: 8px 0; border-top: 1px solid var(--line); }
    .side2 nav a {
      display: flex; align-items: center; gap: 13px; padding: 11px 13px; border-radius: 14px;
      color: var(--ink-soft); text-decoration: none; font-size: 13.5px; font-weight: 600;
      letter-spacing: 0.6px; text-transform: uppercase;
      transition: color .2s, background .2s;
    }
    .side2 nav a svg { width: 18px; height: 18px; opacity: .85; }
    .side2 nav a:hover { color: var(--ink); background: rgba(20,20,40,0.04); }
    .side2 nav a.active { color: #fff; background: var(--red); box-shadow: 0 12px 26px -14px rgba(238,37,50,0.55); }
    .side2 nav a.active svg { color: #fff; opacity: 1; }
    .side2 .spacer { flex: 1; }
    .side2 .foot {
      display: flex; align-items: center; gap: 11px; margin-top: 16px; padding-top: 16px;
      border-top: 1px solid var(--line); background: none; border-left: 0; border-right: 0; border-bottom: 0;
      cursor: pointer; width: 100%; text-align: left;
    }
    .side2 .foot .av {
      width: 34px; height: 34px; border-radius: 11px; background: linear-gradient(135deg, var(--green), #c81e2a);
      color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
    }
    .side2 .foot .nm { font-size: 13px; font-weight: 600; color: var(--ink); }
    .side2 .foot .rl { font-size: 11px; color: var(--ink-soft); }

    /* ---------- Main ---------- */
    .main2 { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

    /* Utility bar */
    .topbar2 { display: flex; justify-content: flex-end; align-items: center; gap: 12px; height: 6px; margin-bottom: 6px; }
    .topbar2 .ut {
      position: relative; width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.65);
      color: var(--ink-soft); cursor: pointer; text-decoration: none;
      box-shadow: 0 10px 26px -18px rgba(20,20,40,0.5); transition: transform .2s, color .2s;
    }
    .topbar2 .ut:hover { transform: translateY(-1px); color: var(--ink); }
    .topbar2 .ut .dot { position: absolute; top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 99px; background: #ff3b30; border: 1.5px solid #fff; }
    .topbar2 .ut.avatar { width: 42px; height: 42px; padding: 0; overflow: hidden; border: 2px solid #fff; }
    .topbar2 .ut.avatar img { width: 100%; height: 100%; object-fit: cover; }

    /* ---------- Top row: hero + shortcuts ---------- */
    .top2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
    .top2 .hero2 { grid-column: span 2; }
    @media (max-width: 1080px) { .top2 { grid-template-columns: 1fr; } .top2 .hero2 { grid-column: 1 / -1; } }

    .hero2 {
      position: relative; aspect-ratio: 796 / 372; height: auto; border-radius: 26px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 30px 70px -42px rgba(20,20,40,0.55); isolation: isolate;
    }
    .hero2 .slide { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 1.1s ease; }
    .hero2 .slide.on { opacity: 1; }
    .hero2 .scrim { position: absolute; inset: 0; z-index: 1; background: linear-gradient(100deg, rgba(8,12,20,0.72) 0%, rgba(8,12,20,0.38) 44%, rgba(8,12,20,0) 72%); }
    .hero2 .slabel { position: absolute; z-index: 3; right: 18px; top: 16px; font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,0.92); background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 99px; backdrop-filter: blur(6px); }
    .hero2 .hbody { position: absolute; z-index: 2; left: 42px; top: 50%; transform: translateY(-50%); right: 40px; }
    .hero2 .htitle { font-size: 38px; line-height: 1.04; font-weight: 700; color: #fff; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 2px 26px rgba(0,0,0,0.45); }
    .hero2 .hsub { margin-top: 14px; color: rgba(255,255,255,0.88); font-size: 15px; }
    /* Baked slides are complete designed artwork (title + subtitle in the
       image): no scrim/overlay; the whole slide links to the composer. */
    .hero2 .hero-link { position: absolute; inset: 0; z-index: 2; }
    .hero2 .herobtn {
      display: inline-block; margin-top: 22px; padding: 12px 26px; border-radius: 99px;
      background: rgba(255,255,255,0.95); color: #14181f; font-size: 14px; font-weight: 600; text-decoration: none;
      box-shadow: 0 12px 30px -14px rgba(0,0,0,0.5); transition: transform .2s, background .2s;
    }
    .hero2 .herobtn:hover { transform: translateY(-2px); background: #fff; }
    .hero2 .dots { position: absolute; z-index: 3; left: 50%; transform: translateX(-50%); bottom: 22px; display: flex; gap: 8px; }
    .hero2 .dots .d { width: 8px; height: 8px; border-radius: 99px; background: rgba(255,255,255,0.45); transition: all .3s; cursor: pointer; }
    .hero2 .dots .d.on { width: 24px; background: #fff; }

    /* Shortcuts */
    .shortcuts2 { display: grid; grid-template-rows: repeat(3, 1fr); gap: 20px; }
    @media (max-width: 1080px) { .shortcuts2 { grid-template-rows: none; grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 560px) { .shortcuts2 { grid-template-columns: 1fr; } }
    .scut {
      display: flex; align-items: center; gap: 16px; padding: 0 22px; border-radius: 22px;
      background: var(--card); backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.65); text-decoration: none; color: var(--ink);
      box-shadow: 0 18px 44px -32px rgba(20,20,40,0.45), inset 0 1px 0 rgba(255,255,255,0.7);
      transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s;
    }
    .scut:hover { transform: translateY(-3px); box-shadow: 0 26px 52px -30px rgba(238,37,50,0.35), inset 0 1px 0 rgba(255,255,255,0.8); }
    .scut .ic { width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--red); color: #fff; box-shadow: 0 8px 18px -10px rgba(238,37,50,0.6); }
    .scut .tx { display: flex; flex-direction: column; gap: 2px; }
    .scut .tx b { font-size: 15px; font-weight: 600; letter-spacing: .3px; }
    .scut .tx small { font-size: 12.5px; color: var(--ink-soft); }

    /* ---------- Cards (generic) ---------- */
    .mod {
      border-radius: 24px; padding: 20px; background: var(--card);
      backdrop-filter: blur(22px) saturate(1.5); -webkit-backdrop-filter: blur(22px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.62);
      box-shadow: 0 22px 54px -38px rgba(20,20,40,0.45), inset 0 1px 0 rgba(255,255,255,0.65);
      display: flex; flex-direction: column;
    }
    .mhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .mtitle2 { font-size: 16px; font-weight: 600; color: var(--ink); letter-spacing: .2px; }
    .viewall { font-size: 12.5px; color: var(--green-deep); font-weight: 600; text-decoration: none; }
    .viewall:hover { text-decoration: underline; }
    .period { font-size: 12.5px; color: var(--ink-soft); display: inline-flex; align-items: center; gap: 3px; }
    .ghostbtn { border-radius: 99px; border: 1px solid var(--green); background: var(--accent-soft); color: var(--green-deep); padding: 9px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }

    /* Middle row */
    .modules2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    @media (max-width: 1080px) { .modules2 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 720px) { .modules2 { grid-template-columns: 1fr; } }
    /* min-height (not fixed height) so cards grow to fit content and the grid
       stretches them all equal — never clips/collapses at any width */
    .modules2 .mod { min-height: 230px; }

    /* Upcoming posts */
    .uplist { display: flex; flex-direction: column; gap: 4px; }
    .uprow { display: flex; align-items: center; gap: 12px; padding: 7px 0; }
    .upthumb { width: 42px; height: 42px; border-radius: 11px; background-size: cover; background-position: center; flex-shrink: 0; background-color: #e5e7eb; }
    .upinfo { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .upt { font-size: 13.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .upd { font-size: 11.5px; color: var(--ink-soft); }
    .upplat { flex-shrink: 0; display: flex; align-items: center; }

    /* Total reach */
    .reach2 { position: relative; overflow: hidden; }
    .bignum { font-size: 46px; font-weight: 800; letter-spacing: -1.5px; line-height: 1; color: var(--ink); }
    .delta { margin-top: 8px; font-size: 12.5px; font-weight: 600; }
    /* positive-metric green (convention: up = green), independent of brand-red accent */
    .delta.up { color: #1f9d4d; }
    .delta.down { color: var(--red); }
    .delta span { color: var(--ink-soft); font-weight: 500; }
    .reach2 .spark { position: absolute; left: 0; right: 0; bottom: 0; height: 74px; }
    .reach2 .spark svg { width: 100%; height: 100%; display: block; }

    /* Weather */
    .wx2 .wtop { display: flex; align-items: flex-start; justify-content: space-between; flex: 1; }
    .wx2 .temp { font-size: 52px; font-weight: 800; line-height: 1; letter-spacing: -2px; color: var(--ink); }
    .wx2 .temp .deg { font-size: 24px; vertical-align: top; font-weight: 600; color: var(--ink-soft); }
    .wx2 .wicon svg { width: 58px; height: 58px; }
    .wx2 .cond { margin-top: 8px; font-size: 14px; font-weight: 600; color: var(--ink); }
    .wx2 .loc { font-size: 12px; color: var(--ink-soft); }
    .wx2 .wfoot { margin-top: auto; padding-top: 14px; display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--ink-soft); }
    .wx2 .wfoot b { color: var(--ink); font-weight: 600; }
    .wx2 .wlink { margin-left: auto; color: var(--green-deep); font-weight: 600; text-decoration: none; font-size: 12px; }

    /* ---------- Bottom row ---------- */
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 880px) { .row2 { grid-template-columns: 1fr; } }
    .row2 .mod { min-height: 158px; }

    /* Recent media */
    .mediastrip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; }
    .mediathumb { border-radius: 14px; background-size: cover; background-position: center; background-color: #e5e7eb; transition: transform .2s; }
    .mediathumb:hover { transform: scale(1.04); }

    /* Audience */
    .audrow { display: flex; align-items: center; gap: 12px; flex: 1; }
    .aud { width: 52px; height: 52px; border-radius: 50%; padding: 2.5px; background: var(--ring, #34c759); display: inline-block; }
    .aud img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #fff; display: block; }
    .audadd { width: 44px; height: 44px; border-radius: 50%; border: 1.5px dashed rgba(20,20,40,0.2); background: rgba(255,255,255,0.5); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; }
    .audadd:hover { border-color: var(--green); color: var(--green-deep); }

    .pb-home2 .anim { will-change: transform; }
    `}</style>
  );
}
