"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Hexagon,
  Settings,
  ChevronDown,
  ChevronRight,
  Sun,
  LayoutGrid,
  AlignLeft,
  Tag,
  Zap,
  Wand2,
  Send,
  Check,
  Frame as FrameIcon,
} from "lucide-react";
import Link from "next/link";

/**
 * Posterboy Social - Studio (responsive)
 *
 * Drop-in: app/(app)/studio/page.tsx
 * Stack: Next.js (App Router) / React 19 / Tailwind 4 + lucide-react
 *
 * Layout note: the responsive shell + canvas + control rail are driven by a
 * namespaced <style> block scoped under `.pb-studio`, so it cannot collide with
 * the rest of the app's Tailwind. This is the exact CSS validated visually at
 * 1440 / 1300 / 1000 / 800 / 390 px. Breakpoints:
 *   >=1380px  desktop  - sidebar | canvas | rail
 *   <=1379px  tablet   - rail drops below canvas as a horizontal control bar
 *   <=860px   sm       - sidebar becomes a top bar; controls grid
 *   <=600px   mobile   - full stack; frame + prompt scale up
 *
 * Wiring TODOs marked inline (generate -> /api/generate, publish -> /api/publish).
 */

// Post target per platform, with the recommended feed-post pixel size.
// `genAspect` is forwarded to the image API (mapped to a supported ratio);
// `w`/`h` drive the morphing canvas frame.
const PLATFORMS = [
  { id: "instagram", label: "Instagram", w: 1080, h: 1350, genAspect: "4:5" },
  { id: "facebook", label: "Facebook", w: 1200, h: 630, genAspect: "16:9" },
  { id: "x", label: "X", w: 1600, h: 900, genAspect: "16:9" },
  { id: "linkedin", label: "LinkedIn", w: 1200, h: 627, genAspect: "16:9" },
  { id: "tiktok", label: "TikTok", w: 1080, h: 1920, genAspect: "9:16" },
] as const;

type PostType = "photo" | "update" | "offer";
type WhenOption = "now" | "schedule";
type GenState = "idle" | "generating" | "done";

export default function PosterboyStudio() {
  const [platformIdx, setPlatformIdx] = useState(0);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "grid">("light");
  const [postType, setPostType] = useState<PostType>("photo");
  const [channels, setChannels] = useState<Set<string>>(new Set(["instagram"]));
  const [when, setWhen] = useState<WhenOption>("now");
  const [prompt, setPrompt] = useState("");
  const [genState, setGenState] = useState<GenState>("idle");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [publishState, setPublishState] = useState<"idle" | "published">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const postSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Posterboy Studio | posterboy";
  }, []);

  // Close the post-format menu on outside click.
  useEffect(() => {
    if (!formatMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!postSelectRef.current?.contains(e.target as Node)) {
        setFormatMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [formatMenuOpen]);

  // Selected platform + the frame size that fits a square stage while
  // preserving the post's aspect ratio (both dims as % so they transition).
  const platform = PLATFORMS[platformIdx];
  const frameRatio = platform.w / platform.h;
  const frameSize =
    frameRatio >= 1
      ? { width: "100%", height: `${(100 / frameRatio).toFixed(2)}%` }
      : { width: `${(frameRatio * 100).toFixed(2)}%`, height: "100%" };

  const toggleChannel = (id: string) =>
    setChannels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const generate = async () => {
    if (!prompt.trim() || genState === "generating") {
      inputRef.current?.focus();
      return;
    }
    setGenState("generating");
    setError("");
    const savedPrompt = prompt.trim();
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: savedPrompt,
          aspectRatio: platform.genAspect,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error || "Generation failed";
        setError(
          msg.includes("not configured")
            ? "Image generation is not available yet. API key needs to be configured."
            : msg,
        );
        setGenState("idle");
        return;
      }
      setGeneratedUrl(data.image);
      setGenState("done");
    } catch {
      setError("Network error. Please try again.");
      setGenState("idle");
    }
  };

  const publish = async () => {
    if (genState !== "done" || !generatedUrl) {
      inputRef.current?.focus();
      return;
    }
    const platform =
      channels.has("instagram") && channels.has("facebook")
        ? "both"
        : channels.has("instagram")
          ? "instagram"
          : "facebook";

    try {
      const { buildMetaPublishPayload } = await import("@/lib/meta-publish-payload");
      const payload = await buildMetaPublishPayload({
        platform,
        caption: prompt.trim() || "Posted with Posterboy Studio",
        imageUrl: generatedUrl,
      });
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Publish failed. Connect Meta in Settings.");
        return;
      }
      setPublishState("published");
      setTimeout(() => setPublishState("idle"), 2200);
    } catch {
      setError("Could not publish right now.");
    }
  };

  return (
    <div className="pb-studio h-full overflow-hidden">
      <StudioStyles />
      <div className="app">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <Link href="/dashboard" className="logo" aria-label="Posterboy — Home">POSTER<span className="red">BOY</span></Link>
          <h2 className="studio-title">Studio</h2>
          <nav className="nav">
            <Link href="/dashboard/studio" className="active"><Sparkles size={18} /><span>Create</span></Link>
            <Link href="/dashboard/dispatch"><Calendar size={18} /><span>Schedule</span></Link>
            <Link href="/dashboard/templates"><ImageIcon size={18} /><span>Library</span></Link>
            <Link href="/dashboard/brand-intake"><Hexagon size={18} /><span>Brand</span></Link>
            <Link href="/dashboard/settings"><Settings size={18} /><span>Settings</span></Link>
          </nav>
          <div className="voice-card">
            <div className="label">Brand voice</div>
            <button className="voice-select"><span>Posterboy Studio</span><ChevronDown size={14} /></button>
            <div className="desc">Minimal. Bold. Timeless. We speak with clarity and create with purpose.</div>
            <button className="manage"><span>Manage voice</span><ChevronRight size={14} /></button>
          </div>
          <button className="workspace">
            <span className="ws-avatar">PS</span>
            <span><span className="ws-name">Posterboy Studio</span><span className="ws-plan">Pro Plan</span></span>
            <ChevronDown className="ws-chev" size={14} />
          </button>
        </aside>

        {/* CANVAS */}
        <main className="canvas">
          <div className="canvas-wall-lines" />
          <div className="canvas-floor" />

          <div className="canvas-top">
            <div className="post-select" ref={postSelectRef}>
              <button
                type="button"
                className={`dim-chip${formatMenuOpen ? " open" : ""}`}
                onClick={() => setFormatMenuOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={formatMenuOpen}
              >
                <FrameIcon size={15} />
                <span className="post-label">Post</span>
                <span className="post-meta">{platform.label} · {platform.w} × {platform.h}</span>
                <ChevronDown className="chev" size={14} />
              </button>
              {formatMenuOpen && (
                <ul className="post-menu" role="listbox">
                  {PLATFORMS.map((p, i) => (
                    <li key={p.id} role="option" aria-selected={i === platformIdx}>
                      <button
                        type="button"
                        className={`post-option${i === platformIdx ? " active" : ""}`}
                        onClick={() => {
                          setPlatformIdx(i);
                          setFormatMenuOpen(false);
                        }}
                      >
                        <span className="po-name">{p.label}</span>
                        <span className="po-dim">{p.w} × {p.h}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="top-toggles">
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={16} /></button>
              <button className={theme === "grid" ? "active" : ""} onClick={() => setTheme("grid")}><LayoutGrid size={16} /></button>
            </div>
          </div>

          <div className="frame-wrap">
            <div
              className={`frame${genState === "generating" ? " generating" : ""}${genState === "done" ? " done" : ""}`}
              style={frameSize}
            >
              <div
                className="preview"
                style={genState === "done" && generatedUrl ? { backgroundImage: `url('${generatedUrl}')` } : undefined}
              />
              {genState === "idle" && <div className="frame-hint">Type a prompt to generate</div>}
            </div>
          </div>

          {error ? (
            <div className="studio-error">
              <p>{error}</p>
              <button type="button" onClick={() => setError("")}>Dismiss</button>
            </div>
          ) : null}

          <div className="prompt-bar">
            <input
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && genState !== "generating" && void generate()}
              placeholder="Type in your prompt"
              disabled={genState === "generating"}
            />
            <button
              type="button"
              className="magic-wand"
              onClick={() => void generate()}
              disabled={genState === "generating"}
              aria-label="Generate"
            >
              <Wand2 size={20} />
            </button>
          </div>
        </main>

        {/* RIGHT RAIL / CONTROL BAR */}
        <aside className="right-rail">
          <div className="rail-section">
            <div className="rail-label">Post type</div>
            <div className="post-type">
              <button className={postType === "photo" ? "active" : ""} onClick={() => setPostType("photo")}><ImageIcon size={14} />Photo</button>
              <button className={postType === "update" ? "active" : ""} onClick={() => setPostType("update")}><AlignLeft size={14} />Update</button>
              <button className={postType === "offer" ? "active" : ""} onClick={() => setPostType("offer")}><Tag size={14} />Offer</button>
            </div>
          </div>

          <div className="rail-section">
            <div className="rail-label">Channels</div>
            <button type="button" className={`list-row${channels.has("instagram") ? " active" : ""}`} onClick={() => toggleChannel("instagram")}>
              <ChannelIcon type="instagram" /><span className="lbl">Instagram</span><span className="check" />
            </button>
            <button type="button" className={`list-row${channels.has("facebook") ? " active" : ""}`} onClick={() => toggleChannel("facebook")}>
              <ChannelIcon type="facebook" /><span className="lbl">Facebook</span><span className="check" />
            </button>
          </div>

          <div className="rail-section">
            <div className="rail-label">When</div>
            <button className={`list-row${when === "now" ? " active" : ""}`} onClick={() => setWhen("now")}>
              <Zap className="icon" size={16} /><span className="lbl">Now</span><span className="check" />
            </button>
            <button className={`list-row${when === "schedule" ? " active" : ""}`} onClick={() => setWhen("schedule")}>
              <Calendar className="icon" size={16} /><span className="lbl">Schedule</span><span className="check" />
            </button>
          </div>

          <div className="rail-section tools">
            <button className="tool-row"><span className="label">Image tools</span><ChevronRight size={14} /></button>
            <button className="tool-row"><span className="label">AI enhance</span><span className="pro-tag">PRO</span></button>
            <button className="tool-row"><span className="label">Caption assist</span><ChevronRight size={14} /></button>
            <button className="tool-row"><span className="label">Background remover</span><span className="pro-tag">PRO</span></button>
            <button className="tool-row"><span className="label">Brand kit</span><ChevronRight size={14} /></button>
          </div>

          <div className="rail-actions">
            <Link href="/dashboard/dispatch" className="btn-outline"><Calendar size={15} />Schedule</Link>
            <button
              type="button"
              className={`btn-publish${publishState === "published" ? " published" : ""}`}
              onClick={() => void publish()}
              disabled={genState !== "done" || !generatedUrl}
              style={publishState === "published" ? { background: "#1aa260" } : undefined}
            >
              {publishState === "published" ? (<><Check size={15} strokeWidth={2.5} />Published</>) : (<><Send size={15} />Publish</>)}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ChannelIcon({ type }: { type: "instagram" | "facebook" }) {
  if (type === "instagram") {
    return (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StudioStyles() {
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
    --red-soft: #fff1f2;
    --green: #1aa260;
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
    font-size: 14px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    height: 100%;
  }.pb-studio button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }.pb-studio button:disabled { cursor: not-allowed; opacity: 0.45; }.pb-studio input { font-family: inherit; }.pb-studio input:disabled { opacity: 0.6; }.pb-studio a.btn-outline { text-decoration: none; color: inherit; }.pb-studio .app {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr) 320px;
    grid-template-areas: "sidebar canvas rail";
    gap: 16px;
    padding: 16px;
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
    font-size: 13px;
    text-align: center;
    box-shadow: 0 8px 24px rgba(15, 15, 20, 0.12);
  }.pb-studio .studio-error button {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
    color: #ee2532;
  }.pb-studio .sidebar { grid-area: sidebar; min-width: 0; }.pb-studio .canvas { grid-area: canvas;  min-width: 0; }.pb-studio .right-rail { grid-area: rail;    min-width: 0; }.pb-studio /* ============ SIDEBAR ============ */
  .sidebar {
    background: var(--card);
    border-radius: var(--radius);
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }.pb-studio .logo {
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.02em;
    margin-bottom: 24px;
    text-decoration: none;
    color: var(--ink);
    display: inline-block;
    width: fit-content;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .pb-studio .logo:hover { opacity: 0.7; }.pb-studio .logo .red { color: var(--red); }.pb-studio .studio-title {
    font-family: var(--serif);
    font-size: 36px;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin-bottom: 28px;
    line-height: 1;
  }.pb-studio .nav { display: flex; flex-direction: column; gap: 2px; margin-bottom: 24px;   }.pb-studio .nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 10px;
    color: var(--ink-2);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.15s ease;
  }.pb-studio .nav a:hover { background: #f6f6f8; }.pb-studio .nav a.active {
    background: #f4f4f6;
    color: var(--ink);
    font-weight: 600;
  }.pb-studio .nav a.active svg { color: var(--red); }.pb-studio .nav a svg { width: 18px; height: 18px; color: var(--ink-2); }.pb-studio .voice-card {
    margin-top: auto;
    background: #fafafb;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 12px;
  }.pb-studio .voice-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; font-weight: 500; }.pb-studio .voice-card .voice-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 12px;
  }.pb-studio .voice-card .voice-select svg { width: 14px; height: 14px; color: var(--muted); }.pb-studio .voice-card .desc {
    font-family: var(--serif);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.4;
    color: var(--ink-2);
    margin-bottom: 14px;
  }.pb-studio .voice-card .manage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }.pb-studio .voice-card .manage svg { width: 14px; height: 14px; color: var(--muted); }.pb-studio .workspace {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 6px;
    cursor: pointer;
    border-radius: 10px;
  }.pb-studio .workspace .ws-avatar {
    width: 36px; height: 36px;
    background: #1a1a1c;
    color: white;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }.pb-studio .workspace .ws-name { font-size: 13.5px; font-weight: 600; line-height: 1.2; }.pb-studio .workspace .ws-plan { font-size: 12px; color: var(--muted); margin-top: 2px; }.pb-studio .workspace .ws-chev { margin-left: auto; color: var(--muted-2); }.pb-studio /* ============ CANVAS ============ */
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
    font-size: 13.5px;
    font-weight: 500;
    color: var(--ink);
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }.pb-studio .dim-chip svg { width: 15px; height: 15px; color: var(--ink-2); }.pb-studio .dim-chip .post-label { font-weight: 600; }.pb-studio .dim-chip .post-meta { color: var(--muted); font-weight: 500; font-variant-numeric: tabular-nums; }.pb-studio .dim-chip .chev { color: var(--muted); transition: transform 0.2s ease; }.pb-studio .dim-chip.open .chev { transform: rotate(180deg); }.pb-studio .post-select { position: relative; }.pb-studio .post-menu {
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
    font-size: 13.5px;
    color: var(--ink);
    transition: background 0.14s ease;
  }.pb-studio .post-option:hover { background: rgba(0,0,0,0.05); }.pb-studio .post-option.active { background: rgba(0,0,0,0.06); font-weight: 600; }.pb-studio .post-option .po-dim { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }.pb-studio .top-toggles {
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
    transition: background 0.15s ease;
  }.pb-studio .top-toggles button.active { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }.pb-studio .top-toggles button:not(.active):hover { background: rgba(255,255,255,0.5); }.pb-studio .top-toggles button svg { width: 16px; height: 16px; }.pb-studio /* The glowing magic frame */
  .frame-wrap {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -56%);
    width: 42%;
    max-width: 460px;
    aspect-ratio: 1;
    z-index: 10;
    display: grid;
    place-items: center;
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
  .frame.generating::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg,
      rgba(255,255,255,0.4) 0%,
      rgba(238,37,50,0.15) 25%,
      rgba(255,255,255,0.4) 50%,
      rgba(238,37,50,0.15) 75%,
      rgba(255,255,255,0.4) 100%
    );
    background-size: 300% 100%;
    animation: pbsShimmer 2s linear infinite;
    z-index: 2;
  }@keyframes pbsShimmer {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }.pb-studio .frame .preview {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity 0.6s ease;
    z-index: 3;
  }.pb-studio .frame.done .preview { opacity: 1; }.pb-studio /* The empty state caption (subtle, .pb-studio only visible on hover) */
  .frame-hint {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(0,0,0,0.3);
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 4;
  }.pb-studio .frame:hover .frame-hint { opacity: 1; }.pb-studio /* Prompt bar — glass morphism */
  .prompt-bar {
    position: absolute;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%);
    width: min(680px, 78%);
    height: 76px;
    background: rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1.5px solid rgba(255, 255, 255, 0.42);
    border-radius: 16px;
    display: flex;
    align-items: center;
    padding: 0 20px 0 26px;
    gap: 12px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.5),
      0 10px 40px rgba(0,0,0,0.18);
    z-index: 15;
    transition: all 0.25s ease;
  }.pb-studio .prompt-bar:focus-within {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.7);
    transform: translateX(-50%) translateY(-2px);
  }.pb-studio .prompt-bar input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15.5px;
    font-weight: 400;
    color: rgba(20, 20, 25, 0.85);
  }.pb-studio .prompt-bar input::placeholder {
    color: rgba(20, 20, 25, 0.5);
  }.pb-studio .magic-wand {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.45);
    border: 1px solid rgba(255,255,255,0.5);
    transition: all 0.15s ease;
  }.pb-studio .magic-wand:hover {
    background: var(--red);
    border-color: var(--red);
    transform: scale(1.05);
  }.pb-studio .magic-wand:hover svg { color: white; }.pb-studio .magic-wand svg { width: 20px; height: 20px; color: rgba(20,20,25,0.8); transition: color 0.15s; }.pb-studio /* ============ RIGHT RAIL ============ */
  .right-rail {
    background: var(--card);
    border-radius: var(--radius);
    padding: 22px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }.pb-studio .rail-section { margin-bottom: 22px; }.pb-studio .rail-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    font-weight: 600;
    margin-bottom: 10px;
  }.pb-studio /* Post type segmented control */
  .post-type {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px;
    background: #f4f4f6;
    border-radius: 10px;
    padding: 4px;
  }.pb-studio .post-type button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 6px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    transition: all 0.15s ease;
  }.pb-studio .post-type button.active {
    background: white;
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    font-weight: 600;
  }.pb-studio .post-type button svg { width: 14px; height: 14px; }.pb-studio /* Selectable list items */
  .list-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border: 1px solid var(--line);
    border-radius: 11px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }.pb-studio .list-row:hover { background: #fafafa; }.pb-studio .list-row.active {
    border-color: var(--ink);
    background: #fafafa;
  }.pb-studio .list-row svg.icon { width: 16px; height: 16px; color: var(--ink-2); }.pb-studio .list-row .lbl { flex: 1; font-size: 13.5px; font-weight: 500; }.pb-studio .list-row .check {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--line-2);
    transition: all 0.15s ease;
  }.pb-studio .list-row.active .check {
    background: var(--ink);
    border-color: var(--ink);
    position: relative;
  }.pb-studio .list-row.active .check::after {
    content: '';
    width: 4px; height: 4px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }.pb-studio /* Tools list */
  .tool-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 0;
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    transition: opacity 0.15s ease;
  }.pb-studio .tool-row:last-child { border-bottom: none; }.pb-studio .tool-row:hover { opacity: 0.7; }.pb-studio .tool-row .label {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
  }.pb-studio .tool-row .pro-tag {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--red);
    background: var(--red-soft);
    padding: 2px 6px;
    border-radius: 4px;
  }.pb-studio .tool-row svg { width: 14px; height: 14px; color: var(--muted-2); }.pb-studio /* Bottom actions */
  .rail-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 18px;
  }.pb-studio .btn-outline {
    width: 100%;
    background: white;
    border: 1px solid var(--line-2);
    border-radius: 12px;
    padding: 13px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }.pb-studio .btn-outline:hover { background: #fafafa; }.pb-studio .btn-outline svg { width: 15px; height: 15px; color: var(--ink-2); }.pb-studio .btn-publish {
    width: 100%;
    background: #0d0d10;
    color: white;
    border-radius: 12px;
    padding: 14px;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
  }.pb-studio .btn-publish:hover { background: #1a1a1d; transform: translateY(-1px); }.pb-studio .btn-publish:active { transform: translateY(0); }.pb-studio .btn-publish svg { width: 15px; height: 15px; }@media (max-width: 1379px) {.pb-studio .app {
      grid-template-columns: 232px minmax(0, 1fr);
      grid-template-areas: "sidebar canvas" "sidebar rail";
    }.pb-studio .canvas { min-height: 620px; }.pb-studio /* Rail becomes a horizontal control strip under the canvas */
    .right-rail {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 22px 28px;
      align-items: start;
      padding: 22px 24px;
    }.pb-studio .rail-section { margin-bottom: 0; }.pb-studio .rail-actions { grid-column: 1 / -1; margin-top: 4px; flex-direction: row; padding-top: 18px; border-top: 1px solid var(--line); }.pb-studio .rail-actions .btn-outline, .pb-studio .rail-actions .btn-publish { flex: 1; }.pb-studio /* keep the tools block from stretching oddly */
    .right-rail > .rail-section:nth-of-type(n) { min-width: 0; }}@media (max-width: 860px) {.pb-studio .app { grid-template-columns: minmax(0, 1fr); grid-template-areas: "sidebar" "canvas" "rail"; }.pb-studio .sidebar { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px 14px; padding: 16px 18px; }.pb-studio .studio-title { display: none; }.pb-studio /* "Studio" wordmark hidden in compact bar */
    .logo { margin-bottom: 0; margin-right: auto; }.pb-studio .nav { flex-direction: row; flex-wrap: wrap; width: 100%; margin-bottom: 0; gap: 4px; }.pb-studio .nav a { padding: 9px 14px; background: #f4f4f6; }.pb-studio .nav a.active { background: #ececef; }.pb-studio .voice-card, .pb-studio .workspace { display: none; }.pb-studio /* secondary on small screens */

    .canvas { min-height: 540px; }.pb-studio .right-rail { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }}@media (max-width: 600px) {.pb-studio .app { padding: 10px; gap: 12px; }.pb-studio .canvas { min-height: 460px; }.pb-studio .frame-wrap { width: 64%; max-width: 320px; transform: translate(-50%, -60%); }.pb-studio .prompt-bar { width: 90%; height: 64px; bottom: 22px; padding: 0 14px 0 20px; }.pb-studio .prompt-bar input { font-size: 14px; }.pb-studio .magic-wand { width: 40px; height: 40px; }.pb-studio .canvas-top { top: 14px; left: 14px; right: 14px; }.pb-studio .dim-chip { padding: 8px 12px; font-size: 12.5px; }.pb-studio .right-rail { grid-template-columns: minmax(0, 1fr); padding: 20px; }.pb-studio .rail-actions { flex-direction: column; }.pb-studio .rail-actions .btn-outline, .pb-studio .rail-actions .btn-publish { flex: none; width: 100%; }}@media (max-width: 380px) {.pb-studio .frame-wrap { width: 72%; }.pb-studio .nav a span { font-size: 13px; }}
    `}</style>
  );
}
