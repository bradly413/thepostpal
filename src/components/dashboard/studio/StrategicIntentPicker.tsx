"use client";

import { type ReactNode } from "react";
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

/** One lucide glyph per intent. */
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
  /** Closes the menu after a pick. */
  onClose?: () => void;
  /** Rendered as the last row below a divider (the photo-upload row). */
  uploadSlot?: ReactNode;
}

/**
 * Strategic intent menu — opened from the Tools button in the composer bar.
 * Each post angle is a written-out row (icon + label + one-line description),
 * not a bare icon. Selecting one routes the composer into that intent.
 */
export default function StrategicIntentPicker({
  selectedId,
  onSelect,
  onClose,
  uploadSlot,
}: Props) {
  return (
    <div className="pb-tools-menu" role="menu" aria-label="What are you posting about?">
      <p className="pb-tools-menu-head">What are you posting about?</p>
      {STRATEGIC_INTENTS.map((intent) => {
        const Icon = INTENT_ICONS[intent.id];
        const active = selectedId === intent.id;
        return (
          <button
            key={intent.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            className={`pb-tool-row${active ? " is-active" : ""}`}
            onClick={() => {
              onSelect(intent.id);
              onClose?.();
            }}
          >
            <Icon size={17} strokeWidth={1.7} aria-hidden className="pb-tool-row-ico" />
            <span className="pb-tool-row-text">
              <span className="pb-tool-row-label">{intent.label}</span>
              <span className="pb-tool-row-desc">{intent.description}</span>
            </span>
          </button>
        );
      })}

      {uploadSlot ? (
        <>
          <span className="pb-tool-row-div" aria-hidden />
          {uploadSlot}
        </>
      ) : null}

      <style>{`
        .pb-studio .pb-tools-menu {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          width: 340px;
          max-width: min(340px, 86vw);
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(20px) saturate(1.6);
          -webkit-backdrop-filter: blur(20px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 16px;
          box-shadow: 0 24px 60px -22px rgba(20,20,40,0.45), 0 2px 8px rgba(20,20,40,0.08);
          padding: 8px;
          z-index: 30;
          animation: pbToolsIn var(--duration-standard, 200ms) var(--ease-enter, ease-out);
        }
        @keyframes pbToolsIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        .pb-studio .pb-tools-menu-head {
          margin: 4px 10px 8px;
          font-size: var(--text-eyebrow, 10.5px); font-weight: 700;
          letter-spacing: var(--tracking-eyebrow, 0.14em); text-transform: uppercase;
          color: var(--muted, #8a8884);
        }
        .pb-studio .pb-tool-row {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 9px 10px; border: 0; background: transparent; border-radius: 10px;
          cursor: pointer; text-align: left; color: var(--ink, #1c1c1e);
          transition: var(--transition-color);
        }
        .pb-studio .pb-tool-row:hover, .pb-studio .pb-tool-row:focus-visible {
          background: rgba(20,20,30,0.05);
        }
        .pb-studio .pb-tool-row.is-active { background: rgba(238,37,50,0.08); }
        .pb-studio .pb-tool-row.is-active .pb-tool-row-ico,
        .pb-studio .pb-tool-row.is-active .pb-tool-row-label { color: var(--green-deep, #c81e2a); }
        .pb-studio .pb-tool-row-ico { flex: none; color: var(--ink-2, #2a2a2e); }
        .pb-studio .pb-tool-row-text { display: flex; flex-direction: column; min-width: 0; }
        .pb-studio .pb-tool-row-label { font-size: var(--text-body-sm, 13px); font-weight: 600; line-height: 1.3; }
        .pb-studio .pb-tool-row-desc {
          font-size: var(--text-caption, 12.5px); line-height: 1.35; color: var(--muted, #8a8884);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pb-studio .pb-tool-row-div { display: block; height: 1px; margin: 6px 8px; background: rgba(0,0,0,0.08); }
        .pb-studio .pb-tool-row-upload[data-dragging] { background: rgba(238,37,50,0.08); }
        .pb-studio .pb-tool-row-upload[aria-busy="true"] { opacity: 0.7; }
      `}</style>
    </div>
  );
}
