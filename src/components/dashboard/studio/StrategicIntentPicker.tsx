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

/** Short rail labels (the long `label` still drives the AI brief). */
const SHORT_LABEL: Record<StrategicIntentId, string> = {
  launch: "Launch",
  event: "Promote",
  educate: "Educate",
  recruit: "Recruit",
  seasonal: "Holiday",
  story: "Highlight",
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
        y: 10,
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
            <span className="pb-intent-pop" role="tooltip">{SHORT_LABEL[intent.id]}</span>
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
          /* horizontal strip tucked under the prompt bar, matching its width */
          position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%);
          width: min(680px, 78%);
          display: flex; flex-direction: row; align-items: center;
          justify-content: space-between;
          z-index: 16;
        }
        @media (max-width: 600px) {
          .pb-intent-rail { width: 92%; }
        }
        .pb-intent-item { position: relative; display: flex; }
        .pb-intent-rail .pb-intent-ico {
          width: 50px; height: 50px; display: grid; place-items: center;
          border-radius: 14px; color: #b6b4b0; background: transparent;
          transition: color .22s ease, transform .16s ease, filter .25s ease;
        }
        .pb-intent-ico svg { width: 22px; height: 22px; transition: filter .25s ease; }
        .pb-intent-rail .pb-intent-ico:hover:not(:disabled):not(.active) { color: var(--ink, #1c1c1e); }
        .pb-intent-ico:hover:not(:disabled) svg {
          filter: drop-shadow(0 0 6px rgba(238,37,50,0.4))
            drop-shadow(0 0 14px rgba(238,37,50,0.18));
        }
        .pb-intent-rail .pb-intent-ico.active { color: #c81e2a; }
        .pb-intent-ico.active svg {
          filter: drop-shadow(0 0 6px rgba(238,37,50,0.45))
            drop-shadow(0 0 14px rgba(238,37,50,0.2));
        }
        .pb-intent-ico:active:not(:disabled) { transform: scale(0.93); }
        .pb-intent-ico:disabled { opacity: 0.4; cursor: not-allowed; }
        .pb-intent-ico-free { color: var(--muted, #6b6b73); }

        .pb-intent-div {
          width: 1px; height: 20px; background: rgba(0,0,0,0.12); margin: 0 4px;
        }

        /* Label reveal — ABOVE the icon (the rail sits under the prompt bar). */
        .pb-intent-pop {
          position: absolute; bottom: calc(100% + 8px); left: 50%;
          transform: translateX(-50%) translateY(4px);
          white-space: nowrap; font-size: 12px; font-weight: 600; letter-spacing: -0.01em;
          color: #1c1c1e; text-shadow: 0 1px 0 rgba(255,255,255,0.85);
          opacity: 0; visibility: hidden; pointer-events: none; z-index: 19;
          transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
        }
        .pb-intent-item:hover .pb-intent-pop,
        .pb-intent-ico:focus-visible + .pb-intent-pop,
        .pb-intent-ico.active + .pb-intent-pop {
          opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .pb-intent-ico, .pb-intent-pop { transition: none; }
        }
      `}</style>
    </div>
  );
}
