"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import {
  Rocket,
  CalendarDays,
  Lightbulb,
  Users,
  Sparkles,
  MessageSquareQuote,
  type LucideIcon,
} from "lucide-react";
import {
  STRATEGIC_INTENTS,
  type StrategicIntentId,
} from "@/lib/studio/strategic-intents";

/** One lucide glyph per intent — mirrors the platform icons on the opposite rail. */
const INTENT_ICONS: Record<StrategicIntentId, LucideIcon> = {
  launch: Rocket,
  event: CalendarDays,
  educate: Lightbulb,
  recruit: Users,
  seasonal: Sparkles,
  story: MessageSquareQuote,
};

interface Props {
  selectedId: StrategicIntentId | null;
  onSelect: (id: StrategicIntentId) => void;
  disabled?: boolean;
  /** Rendered as the last rail item below a divider (e.g. the photo-upload icon). */
  uploadSlot?: ReactNode;
}

/**
 * Strategic intent picker — a vertical icon rail that mirrors the platform
 * tool-rail on the opposite (right) edge of the canvas. Each intent is an icon;
 * hover/focus reveals its description in a frosted panel to the left. Selection
 * uses the brand red (reads on the light idle canvas, where the tool-rail's
 * white-glow would not).
 */
export default function StrategicIntentPicker({
  selectedId,
  onSelect,
  disabled,
  uploadSlot,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  // GSAP staggered entrance; skipped when the user prefers reduced motion.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".pb-intent-item", {
        autoAlpha: 0,
        x: 14,
        duration: 0.42,
        ease: "power2.out",
        stagger: 0.05,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div
      className="pb-intent-rail"
      ref={railRef}
      role="group"
      aria-label="What are you posting about?"
    >
      {STRATEGIC_INTENTS.map((intent) => {
        const Icon = INTENT_ICONS[intent.id];
        const active = selectedId === intent.id;
        return (
          <div className="pb-intent-item" key={intent.id}>
            <button
              type="button"
              className={`pb-intent-ico${active ? " active" : ""}`}
              disabled={disabled}
              aria-pressed={active}
              aria-label={intent.label}
              onClick={() => onSelect(intent.id)}
            >
              <Icon size={19} strokeWidth={1.6} aria-hidden />
            </button>
            <span className="pb-intent-pop" role="tooltip">
              <span className="pb-intent-pop-label">{intent.label}</span>
              <span className="pb-intent-pop-desc">{intent.description}</span>
            </span>
          </div>
        );
      })}

      {uploadSlot ? (
        <>
          <span className="pb-intent-div" aria-hidden />
          {uploadSlot}
        </>
      ) : null}

      <style>{`
        .pb-intent-rail {
          position: absolute; right: 26px; top: 50%; transform: translateY(-54%);
          display: flex; flex-direction: column; align-items: center; gap: 7px;
          z-index: 18;
        }
        .pb-intent-item { position: relative; display: flex; }
        .pb-intent-ico {
          width: 50px; height: 50px; display: grid; place-items: center;
          border-radius: 14px; color: var(--ink-2, #2a2a2e); background: transparent;
          transition: color .16s ease, transform .16s ease, filter .16s ease;
        }
        .pb-intent-ico svg { width: 22px; height: 22px; transition: filter .2s ease; }
        .pb-intent-ico:hover:not(:disabled):not(.active) {
          color: var(--ink, #0d0d10); transform: translateY(-1px);
        }
        .pb-intent-ico.active { color: var(--red, #ee2532); }
        .pb-intent-ico.active svg {
          filter: drop-shadow(0 2px 9px rgba(238,37,50,0.45));
        }
        .pb-intent-ico:active:not(:disabled) { transform: scale(0.93); }
        .pb-intent-ico:disabled { opacity: 0.4; cursor: not-allowed; }
        .pb-intent-ico-free { color: var(--muted, #6b6b73); }

        .pb-intent-div {
          width: 20px; height: 1px; background: rgba(0,0,0,0.1); margin: 4px 0;
        }

        /* Description reveal — frosted panel to the LEFT of the icon (right edge). */
        .pb-intent-pop {
          position: absolute; right: calc(100% + 10px); top: 50%;
          transform: translateY(-50%) translateX(6px);
          width: 184px; text-align: right; padding: 9px 12px; border-radius: 12px;
          background: rgba(255,255,255,0.94);
          -webkit-backdrop-filter: blur(12px) saturate(1.4);
          backdrop-filter: blur(12px) saturate(1.4);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 10px 26px -8px rgba(15,15,20,0.22), 0 2px 6px rgba(15,15,20,0.06);
          opacity: 0; visibility: hidden; pointer-events: none;
          transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
          z-index: 19;
        }
        .pb-intent-item:hover .pb-intent-pop,
        .pb-intent-ico:focus-visible + .pb-intent-pop {
          opacity: 1; visibility: visible; transform: translateY(-50%) translateX(0);
        }
        .pb-intent-pop-label {
          display: block; font-size: 12.5px; font-weight: 700;
          letter-spacing: -0.01em; color: rgba(22,22,28,0.92); margin-bottom: 2px;
        }
        .pb-intent-pop-desc {
          display: block; font-size: 11px; line-height: 1.38; color: rgba(22,22,28,0.55);
        }

        @media (prefers-reduced-motion: reduce) {
          .pb-intent-ico, .pb-intent-pop { transition: none; }
        }
      `}</style>
    </div>
  );
}
