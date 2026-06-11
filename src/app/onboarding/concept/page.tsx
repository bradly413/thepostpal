"use client";

/**
 * THROWAWAY CONCEPT — /onboarding/concept
 * Curved frosted-glass question carousel. Real DOM inputs on CSS backdrop-filter
 * glass panels (the .pb-panel frost), bowed into a ring; GSAP rotates the ring
 * panel-to-panel as you answer. A small isometric diorama pops off each card.
 * NO WebGL — the glass is CSS so the forms are fully interactive + accessible.
 * Does NOT touch BrandArchitect. Safe to delete.
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/* ---------- iso diorama helpers ---------- */
function IsoCube({ cx, cy, hw, hh, e, top, left, right }: { cx: number; cy: number; hw: number; hh: number; e: number; top: string; left: string; right: string }) {
  const T = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
  const L = `${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + e} ${cx - hw},${cy + e}`;
  const R = `${cx},${cy + hh} ${cx + hw},${cy} ${cx + hw},${cy + e} ${cx},${cy + hh + e}`;
  return <g><polygon points={L} fill={left} /><polygon points={R} fill={right} /><polygon points={T} fill={top} /></g>;
}
const PLAT = { hw: 150, hh: 75, e: 26, top: "#fbf5ec", left: "#e4d4bd", right: "#f0e5d4" };
const plat = (cx: number, cy: number) => <IsoCube cx={cx} cy={cy} {...PLAT} />;
const Sh = ({ cx, cy, rw = 42, rh = 15, o = 0.16 }: { cx: number; cy: number; rw?: number; rh?: number; o?: number }) => <ellipse cx={cx} cy={cy} rx={rw} ry={rh} fill="#3a2a18" opacity={o} />;
function Chip({ x, y, fill, glyph }: { x: number; y: number; fill: string; glyph: React.ReactNode }) {
  return <g transform={`translate(${x} ${y})`}><rect x={-28} y={-28} width={56} height={56} rx={15} fill={fill} /><rect x={-28} y={-28} width={56} height={56} rx={15} fill="url(#gloss)" />{glyph}</g>;
}

function DioWelcome() {
  return <svg viewBox="0 0 600 460" className="mini">{plat(300, 300)}<IsoCube cx={300} cy={250} hw={44} hh={22} e={32} top="#f6ead6" left="#dcc8a8" right="#ecdfc9" /><g className="bob b2"><Sh cx={300} cy={212} rw={52} o={0.13} /><circle cx={300} cy={166} r={40} fill="#fff" stroke="#ece0cd" /><text x={300} y={177} textAnchor="middle" fontFamily="Fraunces,serif" fontStyle="italic" fontWeight={600} fontSize={28} fill="#ee2532">p</text><circle cx={300} cy={166} r={50} fill="none" stroke="#ee2532" strokeOpacity={0.22} /></g><g className="bob b1" fill="#ee2532"><circle cx={210} cy={150} r={4} /><circle cx={392} cy={140} r={3.5} /><circle cx={330} cy={116} r={5} /></g></svg>;
}
function DioName() {
  return <svg viewBox="0 0 600 460" className="mini">{plat(300, 312)}<IsoCube cx={300} cy={262} hw={58} hh={29} e={32} top="#f4ead8" left="#dcc9ac" right="#ecdfca" /><g className="bob b2"><Sh cx={300} cy={236} rw={58} o={0.14} /><g transform="translate(300 156)"><rect x={-78} y={-40} width={156} height={86} rx={14} fill="#fff" stroke="#ece0cd" /><circle cx={-50} cy={0} r={18} fill="#f3d9dc" /><circle cx={-50} cy={-5} r={7} fill="#ee2532" /><path d="M-64 14a14 12 0 0 1 28 0z" fill="#ee2532" /><rect x={-22} y={-12} width={86} height={8} rx={4} fill="#d8c8b0" /><rect x={-22} y={4} width={60} height={8} rx={4} fill="#e6d8c0" /></g></g></svg>;
}
function DioConnect() {
  return <svg viewBox="0 0 600 460" className="mini">{plat(300, 300)}<IsoCube cx={300} cy={244} hw={56} hh={28} e={74} top="#211d26" left="#16131a" right="#1c1922" /><polygon points="300,272 356,244 356,318 300,346" fill="url(#scr)" /><g className="bob b1"><Sh cx={206} cy={196} /><Chip x={206} y={152} fill="#feda75" glyph={<circle r={12} fill="none" stroke="#c13584" strokeWidth={5} />} /></g><g className="bob b2"><Sh cx={304} cy={158} rw={46} /><Chip x={304} y={116} fill="#1877f2" glyph={<text y={10} fontSize={30} fontWeight={800} fill="#fff" textAnchor="middle" fontFamily="system-ui">f</text>} /></g><g className="bob b3"><Sh cx={400} cy={198} /><Chip x={400} y={154} fill="#0a66c2" glyph={<text y={9} fontSize={22} fontWeight={800} fill="#fff" textAnchor="middle" fontFamily="system-ui">in</text>} /></g></svg>;
}
function DioBusiness() {
  return <svg viewBox="0 0 600 460" className="mini">{plat(300, 300)}<IsoCube cx={300} cy={206} hw={80} hh={40} e={92} top="#fbf3e6" left="#d8c4a6" right="#ece0cd" /><polygon points="300,246 380,206 380,226 300,266" fill="#ee2532" />{[0, 1, 2, 3].map((i) => <polygon key={i} points={`${300 + i * 20},${256 - i * 10} ${320 + i * 20},${246 - i * 10} ${320 + i * 20},${266 - i * 10} ${300 + i * 20},${276 - i * 10}`} fill={i % 2 ? "#fff" : "#ee2532"} />)}<polygon points="320,278 338,269 338,304 320,313" fill="#3a2f22" /><polygon points="348,265 370,254 370,278 348,289" fill="#cfe6f0" /><g className="bob b2"><Sh cx={300} cy={120} rw={40} o={0.12} /><rect x={262} y={70} width={76} height={44} rx={11} fill="#fff" stroke="#e6d8c2" /><rect x={274} y={84} width={50} height={6} rx={3} fill="#ee2532" /><rect x={274} y={96} width={34} height={5} rx={3} fill="#d8c8b0" /></g></svg>;
}
function DioDone() {
  return <svg viewBox="0 0 600 460" className="mini">{plat(300, 300)}<g className="bob b2"><Sh cx={300} cy={250} rw={58} o={0.18} /><IsoCube cx={300} cy={206} hw={50} hh={25} e={50} top="url(#coreTop)" left="#c81e2a" right="#ee2532" /><ellipse cx={300} cy={168} rx={74} ry={38} fill="url(#coreGlow)" /></g><g className="bob b1" fill="#ee2532"><circle cx={246} cy={138} r={4} /><circle cx={360} cy={128} r={3.5} /><circle cx={306} cy={110} r={5} /></g></svg>;
}

/* ===================== scenes ===================== */
type Kind = "welcome" | "text" | "connect" | "business" | "done";
const SCENES: { Dio: () => React.JSX.Element; eyebrow: string; title: string; sub: string; kind: Kind }[] = [
  { Dio: DioWelcome, eyebrow: "Welcome", title: "Let’s build your brand", sub: "A few quick questions — no typing required yet. This takes about a minute.", kind: "welcome" },
  { Dio: DioName, eyebrow: "Step 1", title: "First, your name", sub: "So Posterboy knows who it’s working for.", kind: "text" },
  { Dio: DioConnect, eyebrow: "Step 2", title: "Connect your accounts", sub: "Posterboy learns your voice from what’s already there.", kind: "connect" },
  { Dio: DioBusiness, eyebrow: "Step 3", title: "What do you do?", sub: "Your studio gets tuned to your world and your words.", kind: "business" },
  { Dio: DioDone, eyebrow: "All set", title: "Your brand is ready", sub: "Voice, colors, and a posting plan — built and waiting inside.", kind: "done" },
];
const N = SCENES.length;
const STEP = 44;
const RADIUS = 760;
const INDUSTRIES = ["Café / Restaurant", "Real estate", "Salon / Beauty", "Fitness", "Home services", "Healthcare"];

export default function OnboardingConcept() {
  const root = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const ry = useRef(0);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const applyRing = () => {
    if (ringRef.current) ringRef.current.style.transform = `translateZ(-${RADIUS}px) rotateY(${ry.current}deg)`;
  };
  const setFront = (i: number) => panelsRef.current.forEach((p, j) => p?.classList.toggle("is-front", j === i));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFront(index);
    const target = -index * STEP;
    if (reduced) { ry.current = target; applyRing(); return; }
    const tween = gsap.to(ry, { current: target, duration: 0.95, ease: "power3.inOut", onUpdate: applyRing });
    return () => { tween.kill(); };
  }, [index]);

  const go = (d: number) => setIndex((i) => Math.max(0, Math.min(N - 1, i + d)));
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") go(1); };

  return (
    <div ref={root} className="car-root">
      <div className="car-aura" aria-hidden><span /><span /><span /></div>

      <header className="car-top">
        <span className="car-logo">poster<em>boy</em><span className="tm">®</span></span>
        <span className="car-skip">Skip the tour</span>
      </header>

      <div className="car-viewport">
        <div className="car-ring" ref={ringRef} style={{ transform: `translateZ(-${RADIUS}px) rotateY(0deg)` }}>
          {SCENES.map((s, i) => {
            const Dio = s.Dio;
            return (
              <div key={i} ref={(n) => { panelsRef.current[i] = n; }} className={`car-panel${i === 0 ? " is-front" : ""}`} style={{ ["--a" as string]: `${i * STEP}deg` }}>
                <div className="car-card">
                  <div className="car-dio"><Dio /></div>
                  <span className="car-eyebrow">{s.eyebrow}</span>
                  <h2 className="car-title">{s.title}</h2>
                  <p className="car-sub">{s.sub}</p>

                  <div className="car-body">
                    {s.kind === "text" && (
                      <label className="car-field">
                        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} placeholder=" " autoComplete="off" />
                        <span>Your name</span>
                      </label>
                    )}
                    {s.kind === "connect" && (
                      <div className="car-oauths">
                        {[{ k: "ig", label: "Instagram", c: "#c13584" }, { k: "fb", label: "Facebook", c: "#1877f2" }, { k: "li", label: "LinkedIn", c: "#0a66c2" }].map((o) => (
                          <button key={o.k} type="button" className={`car-oauth${connected[o.k] ? " on" : ""}`} style={{ ["--c" as string]: o.c }} onClick={() => setConnected((c) => ({ ...c, [o.k]: !c[o.k] }))}>
                            <span className="dot" />
                            {connected[o.k] ? `${o.label} connected` : `Connect ${o.label}`}
                          </button>
                        ))}
                      </div>
                    )}
                    {s.kind === "business" && (
                      <>
                        <label className="car-field">
                          <input value={business} onChange={(e) => setBusiness(e.target.value)} onKeyDown={onKey} placeholder=" " autoComplete="off" />
                          <span>Business name</span>
                        </label>
                        <div className="car-chips">
                          {INDUSTRIES.map((ind) => (
                            <button key={ind} type="button" className={`car-chip${industry === ind ? " on" : ""}`} onClick={() => setIndustry(ind)}>{ind}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="car-actions">
                    {i > 0 && <button type="button" className="car-back" onClick={() => go(-1)}>Back</button>}
                    {s.kind === "welcome" && <button type="button" className="car-next" onClick={() => go(1)}>Begin</button>}
                    {s.kind === "text" && <button type="button" className="car-next" disabled={!name.trim()} onClick={() => go(1)}>Continue</button>}
                    {s.kind === "connect" && <button type="button" className="car-next" onClick={() => go(1)}>{Object.values(connected).some(Boolean) ? "Continue" : "Skip for now"}</button>}
                    {s.kind === "business" && <button type="button" className="car-next" disabled={!business.trim()} onClick={() => go(1)}>Continue</button>}
                    {s.kind === "done" && <button type="button" className="car-next">Enter Posterboy</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="car-dots" aria-hidden>
        {SCENES.map((_, i) => <span key={i} className={i === index ? "on" : ""} onClick={() => setIndex(i)} />)}
      </div>

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a2230" /><stop offset="1" stopColor="#15121a" /></linearGradient>
          <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.35" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <radialGradient id="coreTop" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor="#ff7a52" /><stop offset="1" stopColor="#ee2532" /></radialGradient>
          <radialGradient id="coreGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff8a5c" stopOpacity="0.55" /><stop offset="1" stopColor="#ff8a5c" stopOpacity="0" /></radialGradient>
        </defs>
      </svg>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&display=swap');

        .car-root {
          position: fixed; inset: 0; overflow: hidden;
          background: linear-gradient(168deg, #f3ece0 0%, #ede3d3 54%, #e7dac6 100%);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #1c1c1e;
        }
        /* drifting warm blobs — gives the frosted glass something to refract */
        .car-aura { position: absolute; inset: -10%; pointer-events: none; filter: blur(40px); }
        .car-aura span { position: absolute; border-radius: 50%; opacity: 0.55; mix-blend-mode: multiply; }
        .car-aura span:nth-child(1) { width: 46vw; height: 46vw; left: 8%; top: 14%; background: radial-gradient(circle, rgba(238,37,50,0.34), transparent 68%); animation: drift1 17s ease-in-out infinite; }
        .car-aura span:nth-child(2) { width: 40vw; height: 40vw; right: 6%; top: 8%; background: radial-gradient(circle, rgba(255,150,70,0.32), transparent 68%); animation: drift2 21s ease-in-out infinite; }
        .car-aura span:nth-child(3) { width: 52vw; height: 52vw; left: 30%; bottom: -6%; background: radial-gradient(circle, rgba(238,90,120,0.28), transparent 70%); animation: drift1 24s ease-in-out infinite reverse; }
        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(6%,-5%); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-7%,6%); } }

        .car-top { position: absolute; top: 0; left: 0; right: 0; z-index: 30; display: flex; justify-content: space-between; align-items: center; padding: 24px clamp(24px,5vw,64px); }
        .car-logo { font-family: var(--font-playfair, var(--font-instrument-serif, Georgia, serif)); font-size: 28px; font-weight: 500; letter-spacing: -0.5px; color: #1c1c1e; display: inline-flex; align-items: baseline; line-height: 1; }
        .car-logo em { font-style: italic; font-weight: 500; }
        .car-logo .tm { font-style: normal; font-size: 0.3em; font-weight: 500; transform: translateY(-0.9em); margin-left: 2px; }
        .car-skip { font-size: 13px; color: #8a8174; cursor: pointer; }
        .car-skip:hover { color: #1c1c1e; }

        .car-viewport { position: absolute; inset: 0; perspective: 1500px; perspective-origin: 50% 48%; }
        .car-ring { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
        .car-panel {
          position: absolute; width: 520px; height: 620px; left: -260px; top: -310px;
          transform: rotateY(var(--a)) translateZ(${RADIUS}px);
          backface-visibility: hidden; opacity: 0.28; filter: blur(1.5px); pointer-events: none;
          transition: opacity 0.6s ease, filter 0.6s ease;
        }
        .car-panel.is-front { opacity: 1; filter: none; pointer-events: auto; }

        .car-card {
          position: relative; width: 100%; height: 100%; box-sizing: border-box;
          padding: 130px 44px 36px; display: flex; flex-direction: column;
          background: rgba(255,255,255,0.62);
          -webkit-backdrop-filter: blur(26px) saturate(1.6); backdrop-filter: blur(26px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.7); border-radius: 30px;
          box-shadow: 0 50px 100px -54px rgba(50,34,15,0.55), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .car-dio { position: absolute; top: -54px; left: 50%; width: 300px; height: 230px; transform: translateX(-50%) translateZ(60px); filter: drop-shadow(0 26px 22px rgba(70,48,22,0.2)); }
        .mini { width: 100%; height: 100%; overflow: visible; }

        .car-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #ee2532; }
        .car-title { margin: 12px 0 0; font-family: Fraunces, serif; font-weight: 600; font-size: 38px; line-height: 1.02; letter-spacing: -0.02em; }
        .car-sub { margin: 14px 0 0; font-size: 15px; line-height: 1.55; color: #6f675b; }
        .car-body { margin-top: 26px; flex: 1; }

        .car-field { position: relative; display: block; }
        .car-field input {
          width: 100%; box-sizing: border-box; font: inherit; font-size: 17px; color: #1c1c1e;
          padding: 22px 16px 10px; border: 1px solid rgba(28,28,30,0.16); border-radius: 14px;
          background: rgba(255,255,255,0.6); outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .car-field input:focus { border-color: #ee2532; box-shadow: 0 0 0 3px rgba(238,37,50,0.14); }
        .car-field span { position: absolute; left: 17px; top: 17px; font-size: 16px; color: #9a9183; pointer-events: none; transition: all 0.18s ease; }
        .car-field input:focus + span, .car-field input:not(:placeholder-shown) + span { top: 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; color: #ee2532; }

        .car-oauths { display: flex; flex-direction: column; gap: 11px; }
        .car-oauth {
          appearance: none; cursor: pointer; font: inherit; font-size: 15px; font-weight: 500; text-align: left;
          display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 14px;
          border: 1px solid rgba(28,28,30,0.14); background: rgba(255,255,255,0.6); color: #1c1c1e; transition: all 0.2s;
        }
        .car-oauth .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); flex: none; transition: all 0.2s; }
        .car-oauth:hover { border-color: var(--c); }
        .car-oauth.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 9%, rgba(255,255,255,0.6)); color: var(--c); font-weight: 600; }
        .car-oauth.on .dot { box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 24%, transparent); }

        .car-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .car-chip { appearance: none; cursor: pointer; font: inherit; font-size: 13px; padding: 8px 14px; border-radius: 99px; border: 1px solid rgba(28,28,30,0.14); background: rgba(255,255,255,0.55); color: #6f675b; transition: all 0.18s; }
        .car-chip:hover { border-color: rgba(28,28,30,0.32); color: #1c1c1e; }
        .car-chip.on { background: #ee2532; border-color: #ee2532; color: #fff; }

        .car-actions { display: flex; align-items: center; gap: 14px; margin-top: 22px; }
        .car-back { appearance: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 15px; padding: 12px 22px; border-radius: 99px; background: transparent; border: 1px solid rgba(28,28,30,0.16); color: #6f675b; transition: all 0.2s; }
        .car-back:hover { border-color: rgba(28,28,30,0.4); color: #1c1c1e; }
        .car-next { appearance: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 15px; padding: 12px 30px; border-radius: 99px; margin-left: auto; background: #ee2532; border: 1px solid #ee2532; color: #fff; box-shadow: 0 14px 30px -14px rgba(238,37,50,0.7); transition: all 0.2s; }
        .car-next:hover:not(:disabled) { background: #d61f2b; }
        .car-next:disabled { opacity: 0.4; cursor: default; box-shadow: none; }

        .car-dots { position: absolute; left: 50%; bottom: 38px; transform: translateX(-50%); z-index: 30; display: flex; gap: 9px; }
        .car-dots span { width: 8px; height: 8px; border-radius: 99px; background: rgba(28,28,30,0.18); cursor: pointer; transition: all 0.3s; }
        .car-dots span.on { width: 26px; background: #ee2532; }

        @media (max-width: 560px) {
          .car-panel { width: 92vw; left: -46vw; }
          .car-card { padding: 120px 26px 30px; }
          .car-title { font-size: 30px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bob, .car-aura span { animation: none; }
        }
        .bob { animation: bob 4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .b1 { animation-duration: 3.4s; } .b2 { animation-duration: 4.6s; animation-delay: -0.6s; } .b3 { animation-duration: 3.9s; animation-delay: -1.2s; }
        @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
      `}</style>
    </div>
  );
}
