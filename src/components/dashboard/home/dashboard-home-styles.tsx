"use client";

// Frosted-glass dashboard home — minimal, modern, "simple but intelligent".
// Scoped under .pb-home2 so it never collides with other dashboard styles.
export function DashboardHomeStyles() {
  return (
    <style>{`
    .pb-home2 {
      --ink: #1c1c1e;
      --ink-soft: #6b6b73;
      --line: rgba(20,20,30,0.08);
      --glass: rgba(255,255,255,0.55);
      --glass-strong: rgba(255,255,255,0.78);
      --glow: #8bd450;
      --glow-2: #43c59e;
      height: 100%;
      min-height: 0;
      overflow-y: auto;
      color: var(--ink);
      font-family: var(--font-inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
      background:
        radial-gradient(1200px 600px at 80% -10%, rgba(139,212,80,0.10), transparent 60%),
        radial-gradient(900px 500px at -5% 110%, rgba(67,197,158,0.10), transparent 55%),
        linear-gradient(160deg, #ecedf0 0%, #e6e7ea 50%, #e9eaed 100%);
    }
    .pb-home2 * { box-sizing: border-box; }

    .home2 {
      display: grid;
      grid-template-columns: 248px 1fr;
      gap: 22px;
      max-width: 1500px;
      margin: 0 auto;
      padding: 22px;
      min-height: 100%;
    }
    @media (max-width: 980px) {
      .home2 { grid-template-columns: 1fr; }
    }

    /* ---------- Sidebar ---------- */
    .side2 {
      position: sticky;
      top: 22px;
      align-self: start;
      height: calc(100vh - 44px);
      display: flex;
      flex-direction: column;
      padding: 26px 22px;
      border-radius: 28px;
      background: var(--glass-strong);
      backdrop-filter: blur(26px) saturate(1.5);
      -webkit-backdrop-filter: blur(26px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.6);
      box-shadow: 0 24px 60px -38px rgba(20,20,40,0.45), inset 0 1px 0 rgba(255,255,255,0.7);
    }
    @media (max-width: 980px) { .side2 { height: auto; position: relative; top: 0; } }
    .side2 .logo {
      font-family: var(--font-playfair, var(--font-instrument-serif, Georgia, serif));
      font-size: 30px;
      font-weight: 500;
      letter-spacing: -0.5px;
      color: var(--ink);
      text-decoration: none;
      margin-bottom: 38px;
      display: inline-flex;
      align-items: baseline;
      line-height: 1;
    }
    .side2 .logo em { font-style: italic; font-weight: 500; }
    .side2 .logo .tm {
      font-style: normal;
      font-size: 0.32em;
      font-weight: 500;
      transform: translateY(-0.9em);
      margin-left: 2px;
      letter-spacing: 0;
    }
    .side2 nav { display: flex; flex-direction: column; gap: 4px; }
    .side2 nav .grp-gap { height: 26px; }
    .side2 nav a {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 12px;
      border-radius: 14px;
      color: var(--ink-soft);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      transition: color .25s ease, background .25s ease, transform .25s ease;
    }
    .side2 nav a svg { width: 17px; height: 17px; opacity: .8; transition: transform .25s ease; }
    .side2 nav a:hover { color: var(--ink); background: rgba(20,20,40,0.04); }
    .side2 nav a:hover svg { transform: translateX(2px); }
    .side2 nav a.active { color: var(--ink); background: rgba(20,20,40,0.06); }
    .side2 .spacer { flex: 1; }
    .side2 .foot {
      display: flex; align-items: center; gap: 10px;
      margin-top: 18px; padding-top: 18px;
      border-top: 1px solid var(--line);
    }
    .side2 .foot .av {
      width: 34px; height: 34px; border-radius: 11px;
      background: linear-gradient(135deg, var(--glow), var(--glow-2));
      color: #fff; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .side2 .foot .nm { font-size: 13px; font-weight: 600; color: var(--ink); }
    .side2 .foot .rl { font-size: 11px; color: var(--ink-soft); }

    /* ---------- Main ---------- */
    .main2 { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
    /* top row + module row share ONE 3-equal-column rhythm so every edge lines up */
    .top2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; align-items: stretch; }
    .top2 .hero2 { grid-column: span 2; }
    @media (max-width: 1080px) {
      .top2 { grid-template-columns: 1fr; }
      .top2 .hero2 { grid-column: 1 / -1; }
    }

    /* Hero slideshow */
    .hero2 {
      position: relative;
      border-radius: 26px;
      overflow: hidden;
      height: 340px;
      border: 1px solid rgba(255,255,255,0.4);
      box-shadow: 0 30px 70px -40px rgba(20,20,40,0.55);
      isolation: isolate;
    }
    .hero2 .slide {
      position: absolute; inset: 0;
      background-size: cover; background-position: center;
      opacity: 0; transition: opacity 1.1s ease;
    }
    .hero2 .slide.on { opacity: 1; }
    .hero2 .scrim {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(105deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.32) 42%, rgba(0,0,0,0) 72%);
    }
    .hero2 .hbody { position: absolute; z-index: 2; left: 40px; bottom: 46px; right: 40px; }
    .hero2 .htitle {
      font-size: 34px; line-height: 1.05; font-weight: 600; color: #fff;
      letter-spacing: 6px; text-transform: uppercase;
      text-shadow: 0 2px 24px rgba(0,0,0,0.4);
    }
    .hero2 .hsub { margin-top: 14px; color: rgba(255,255,255,0.85); font-size: 14px; letter-spacing: .3px; }
    .hero2 .dots { position: absolute; z-index: 3; left: 40px; bottom: 24px; display: flex; gap: 7px; }
    .hero2 .dots .d { width: 7px; height: 7px; border-radius: 99px; background: rgba(255,255,255,0.45); transition: all .3s ease; cursor: pointer; }
    .hero2 .dots .d.on { width: 22px; background: #fff; }
    .hero2 .slabel {
      position: absolute; z-index: 3; right: 18px; top: 16px;
      font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
      color: rgba(255,255,255,0.9); background: rgba(0,0,0,0.28);
      padding: 5px 10px; border-radius: 99px; backdrop-filter: blur(6px);
    }
    .slidecount { margin: 4px 2px 0; font-size: 12px; font-weight: 600; color: var(--ink-soft); letter-spacing: .3px; }

    /* Glow shortcut buttons — 3 strict equal rows; the grid stretches to the hero's height */
    .shortcuts2 { display: grid; grid-template-rows: repeat(3, 1fr); gap: 18px; }
    @media (max-width: 1080px) { .shortcuts2 { grid-template-rows: none; grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 560px) { .shortcuts2 { grid-template-columns: 1fr; } }
    .glowbtn {
      position: relative;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      min-height: 84px;
      border-radius: 22px;
      background: var(--glass-strong);
      backdrop-filter: blur(20px) saturate(1.5);
      -webkit-backdrop-filter: blur(20px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.6);
      color: var(--ink);
      font-size: 15px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
      text-decoration: none;
      box-shadow: 0 18px 44px -30px rgba(20,20,40,0.5), inset 0 1px 0 rgba(255,255,255,0.7);
      overflow: hidden;
      transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease;
    }
    .glowbtn svg { width: 18px; height: 18px; color: var(--ink-soft); transition: color .3s ease; }
    .glowbtn::before {
      content: ""; position: absolute; inset: -2px; border-radius: 24px; padding: 2px; z-index: -1;
      background: conic-gradient(from var(--a, 0deg), transparent 0deg, var(--glow) 70deg, var(--glow-2) 130deg, transparent 200deg, transparent 360deg);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      opacity: .9; animation: spin 5s linear infinite;
    }
    .glowbtn:hover { transform: translateY(-3px); box-shadow: 0 26px 54px -28px rgba(67,197,158,0.55), inset 0 1px 0 rgba(255,255,255,0.8); }
    .glowbtn:hover svg { color: var(--glow-2); }
    @property --a { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    @keyframes spin { to { --a: 360deg; } }

    /* ---------- Module row (same 3-col rhythm as top row) ---------- */
    .modules2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
    @media (max-width: 1080px) { .modules2 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 720px) { .modules2 { grid-template-columns: 1fr; } }
    .mod {
      border-radius: 24px;
      padding: 20px;
      background: var(--glass);
      backdrop-filter: blur(22px) saturate(1.5);
      -webkit-backdrop-filter: blur(22px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.55);
      box-shadow: 0 22px 54px -38px rgba(20,20,40,0.5), inset 0 1px 0 rgba(255,255,255,0.65);
      height: 300px;            /* uniform module height — fluid width, fixed height */
      display: flex; flex-direction: column;
    }
    @media (max-width: 720px) { .mod { height: auto; min-height: 260px; } }
    .mod .mhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .mod .mtitle { font-size: 12px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-soft); }
    .mod .mlink { color: var(--ink-soft); display: inline-flex; }

    /* Calendar module */
    .cal2 .grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; }
    .cal2 .dow { text-align: center; font-size: 9px; font-weight: 700; color: var(--ink-soft); letter-spacing: .5px; padding-bottom: 2px; }
    .cal2 .cell {
      height: 27px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: var(--ink-soft); position: relative;
      border: 1px solid rgba(20,20,40,0.05);
    }
    .cal2 .cell.dim { opacity: .35; }
    .cal2 .cell.today { background: var(--ink); color: #fff; font-weight: 700; border-color: transparent; }
    .cal2 .cell.has::after {
      content: ""; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
      width: 5px; height: 5px; border-radius: 99px; background: linear-gradient(135deg, var(--glow), var(--glow-2));
    }
    .cal2 .cell.today.has::after { background: #fff; }
    .cal2 .legend { margin-top: auto; padding-top: 12px; font-size: 11px; color: var(--ink-soft); display: flex; align-items: center; gap: 7px; }
    .cal2 .legend .dot { width: 6px; height: 6px; border-radius: 99px; background: linear-gradient(135deg, var(--glow), var(--glow-2)); }

    /* Analytics module */
    .an2 .chartwrap { position: relative; flex: 1; min-height: 92px; }
    .an2 svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .an2 .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 14px; }
    .an2 .st .k { font-size: 10px; letter-spacing: .6px; text-transform: uppercase; color: var(--ink-soft); }
    .an2 .st .v { font-size: 19px; font-weight: 700; color: var(--ink); margin-top: 2px; }
    .an2 .st .v .up { font-size: 11px; color: #2faa6a; margin-left: 4px; font-weight: 600; }
    .an2 .toppost { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 11px; color: var(--ink-soft); display: flex; align-items: center; gap: 8px; }
    .an2 .toppost b { color: var(--ink); font-weight: 600; }

    /* Weather module */
    .wx2 { align-items: stretch; }
    .wx2 .wtop { display: flex; align-items: flex-start; justify-content: space-between; }
    .wx2 .temp { font-size: 60px; font-weight: 800; line-height: 1; letter-spacing: -2px; color: var(--ink); }
    .wx2 .temp .deg { font-size: 26px; vertical-align: top; font-weight: 600; color: var(--ink-soft); }
    .wx2 .wicon { font-size: 0; }
    .wx2 .wicon svg { width: 64px; height: 64px; }
    .wx2 .cond { margin-top: 8px; font-size: 14px; font-weight: 600; color: var(--ink); }
    .wx2 .loc { font-size: 12px; color: var(--ink-soft); }
    .wx2 .wfoot { margin-top: auto; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-soft); }
    .wx2 .wfoot b { color: var(--ink); font-weight: 600; }

    /* ---------- Audience strip (horizontal avatar scroller) ---------- */
    .row2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
    @media (max-width: 1080px) { .row2 { grid-template-columns: 1fr; } }
    .friends2 { grid-column: span 2; height: auto; min-height: 0; }
    @media (max-width: 1080px) { .friends2 { grid-column: 1 / -1; } }
    .friends2 .overflow-x {
      overflow-x: auto;
      overscroll-behavior-x: contain;
      padding: 6px 14px 4px 2px;
      scroll-padding-right: 14px;
      scrollbar-width: thin;
      scrollbar-color: rgba(20,20,40,0.18) transparent;
    }
    .friends2 .overflow-x::-webkit-scrollbar { height: 6px; }
    .friends2 .overflow-x::-webkit-scrollbar-thumb { background: rgba(20,20,40,0.16); border-radius: 99px; }
    .friends2 .hfriends {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 70px;
      gap: 18px;
      padding: 4px 2px;
      width: max-content;
    }
    .friends2 figure {
      display: grid; gap: 9px; margin: 0; text-align: center;
      cursor: pointer; user-select: none;
      transition: transform .2s ease-in-out;
    }
    .friends2 figure:hover { transform: scale(1.08); }
    .friends2 picture {
      display: inline-block;
      inline-size: 70px; block-size: 70px;
      border-radius: 50%;
      background:
        radial-gradient(hsl(0 0% 0% / 15%) 60%, transparent 0),
        radial-gradient(#fff 65%, transparent 0),
        linear-gradient(to top right, var(--glow), var(--glow-2));
    }
    .friends2 picture img {
      display: block; inline-size: 100%; block-size: 100%;
      object-fit: cover; clip-path: circle(42%);
    }
    .friends2 figcaption {
      overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      font-weight: 500; font-size: 12px; color: var(--ink);
    }

    /* entrance — GSAP animates these to natural; harmless if JS off */
    .pb-home2 .anim { will-change: transform, opacity; }
    `}</style>
  );
}
