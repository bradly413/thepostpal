"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * StudioHistoryGallery — browse recent creations as a 3D coverflow of cards.
 *
 * The classic CSS-checkbox movie-slider technique (center card flat, neighbors
 * receding in perspective), reimplemented with React state instead of radio
 * hacks. Light-room styling. Entries mix this session's generations with the
 * tenant's posted images — both real, nothing invented.
 *
 * Keyboard: ← → navigate, Enter opens the active card, Escape closes.
 */

export interface StudioHistoryEntry {
  url: string;
  prompt: string;
  at: number;
  source: "session" | "post";
}

const EASE = "cubic-bezier(0.62, 0.28, 0.23, 0.99)";

export default function StudioHistoryGallery({
  entries,
  onPick,
  onClose,
}: {
  entries: StudioHistoryEntry[];
  onPick: (entry: StudioHistoryEntry) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, a - 1));
      else if (e.key === "ArrowRight") setActive((a) => Math.min(entries.length - 1, a + 1));
      else if (e.key === "Enter" && entries[active]) onPick(entries[active]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries, active, onPick, onClose]);

  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="shg" role="dialog" aria-modal="true" aria-label="Your recent creations">
      <div className="shg-backdrop" onClick={onClose} aria-hidden />
      <button type="button" ref={closeRef} className="shg-close" onClick={onClose} aria-label="Close history">
        <X size={18} />
      </button>
      <h2 className="shg-title">Your recent creations</h2>

      {entries.length === 0 ? (
        <p className="shg-empty">Nothing yet — generate an image and it&rsquo;ll show up here.</p>
      ) : (
        <>
          <div className="shg-stage">
            {entries.map((e, i) => {
              const off = i - active;
              const abs = Math.abs(off);
              const dir = off > 0 ? 1 : -1;
              const style: CSSProperties = {
                transform:
                  off === 0
                    ? "translate(-50%, -50%) translateZ(0) rotateY(0deg) scale(1)"
                    : `translate(calc(-50% + ${dir * (38 + Math.min(abs - 1, 2) * 16)}%), -50%) translateZ(${-90 - abs * 60}px) rotateY(${-dir * 44}deg) scale(0.82)`,
                zIndex: 20 - abs,
                opacity: abs > 3 ? 0 : 1,
                pointerEvents: abs > 3 ? "none" : "auto",
              };
              return (
                <div
                  key={`${e.url.slice(0, 48)}-${e.at}`}
                  className={`shg-card${off === 0 ? " is-active" : ""}`}
                  style={style}
                  onClick={() => (off === 0 ? onPick(e) : setActive(i))}
                  role="button"
                  tabIndex={abs <= 1 ? 0 : -1}
                  aria-label={off === 0 ? `Open: ${e.prompt || "creation"}` : `Show ${e.prompt || "creation"}`}
                >
                  <div className="shg-img" style={{ backgroundImage: `url('${e.url}')` }} aria-hidden />
                  <div className="shg-grad" aria-hidden />
                  <div className="shg-meta">
                    <p className="shg-chips">
                      <span>{fmt(e.at)}</span>
                      <span>{e.source === "session" ? "This session" : "Posted"}</span>
                    </p>
                    {e.prompt ? <p className="shg-prompt">{e.prompt}</p> : null}
                    {off === 0 ? <span className="shg-open">Open in studio</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shg-nav">
            <button
              type="button"
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
              aria-label="Previous creation"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="shg-count">{active + 1} / {entries.length}</span>
            <button
              type="button"
              onClick={() => setActive((a) => Math.min(entries.length - 1, a + 1))}
              disabled={active === entries.length - 1}
              aria-label="Next creation"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}

      <style>{`
        .shg { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; }
        .shg-backdrop {
          position: absolute; inset: 0;
          background: rgba(250, 250, 249, 0.86);
          backdrop-filter: blur(18px) saturate(1.4);
          -webkit-backdrop-filter: blur(18px) saturate(1.4);
        }
        .shg-title {
          position: relative; z-index: 2; margin: 26px 0 0; font-size: 15px; font-weight: 700;
          letter-spacing: -0.01em; color: #1c1c1e;
        }
        .shg-empty { position: relative; z-index: 2; margin-top: 40px; font-size: 13.5px; color: #6e6e76; }
        .shg-close {
          position: absolute; z-index: 3; top: 18px; right: 18px; width: 34px; height: 34px;
          display: grid; place-items: center; border-radius: 50%;
          background: rgba(255,255,255,0.9); border: 1px solid rgba(0,0,0,0.07);
          color: #1c1c1e; cursor: pointer; box-shadow: 0 6px 18px -10px rgba(20,20,40,0.4);
        }
        .shg-stage {
          position: relative; z-index: 2; flex: 1; width: 100%;
          perspective: 1100px; transform-style: preserve-3d;
        }
        .shg-card {
          position: absolute; top: 50%; left: 50%;
          width: min(340px, 52vw); aspect-ratio: 4 / 5;
          border-radius: 14px; overflow: hidden; cursor: pointer;
          background: #fff;
          box-shadow: 0 24px 60px -24px rgba(20,20,40,0.45);
          transition: transform 0.6s ${EASE}, opacity 0.45s ease;
          transform-style: preserve-3d;
        }
        .shg-card.is-active { box-shadow: 0 34px 80px -30px rgba(20,20,40,0.5), 0 0 0 2px rgba(238,37,50,0.55); }
        .shg-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
        .shg-card:not(.is-active) .shg-img { filter: saturate(0.75) brightness(0.96); }
        .shg-grad { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 46%); }
        .shg-meta { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 18px; color: #fff; }
        .shg-card:not(.is-active) .shg-meta { opacity: 0; transition: opacity 0.3s ease; }
        .shg-chips { margin: 0 0 6px; display: flex; gap: 6px; }
        .shg-chips span {
          font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
          padding: 3px 8px; border-radius: 99px; background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
        }
        .shg-prompt {
          margin: 0; font-size: 13px; line-height: 1.4; font-weight: 500;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .shg-open {
          display: inline-block; margin-top: 10px; padding: 8px 16px; border-radius: 99px;
          background: #c81e2a; font-size: 12px; font-weight: 600;
          box-shadow: 0 10px 24px -12px rgba(200,30,42,0.7);
        }
        .shg-nav {
          position: relative; z-index: 2; display: flex; align-items: center; gap: 14px;
          padding: 0 0 22px;
        }
        .shg-nav button {
          width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%;
          background: rgba(255,255,255,0.92); border: 1px solid rgba(0,0,0,0.08);
          color: #1c1c1e; cursor: pointer; box-shadow: 0 8px 20px -12px rgba(20,20,40,0.45);
          transition: transform 0.15s ease;
        }
        .shg-nav button:hover:not(:disabled) { transform: translateY(-2px); }
        .shg-nav button:disabled { opacity: 0.35; cursor: default; }
        .shg-count { font-size: 12px; font-weight: 600; color: #6e6e76; font-variant-numeric: tabular-nums; }
        @media (prefers-reduced-motion: reduce) {
          .shg-card { transition: opacity 0.2s ease; }
        }
      `}</style>
    </div>
  );
}
