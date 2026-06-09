"use client";

import {
  STRATEGIC_INTENTS,
  type StrategicIntentId,
} from "@/lib/studio/strategic-intents";

interface Props {
  selectedId: StrategicIntentId | null;
  onSelect: (id: StrategicIntentId) => void;
  onFreeForm: () => void;
  disabled?: boolean;
}

export default function StrategicIntentPicker({
  selectedId,
  onSelect,
  onFreeForm,
  disabled,
}: Props) {
  return (
    <div className="pb-intent-picker">
      <p className="pb-intent-picker-lead">What are you posting about?</p>
      <div className="pb-intent-grid">
        {STRATEGIC_INTENTS.map((intent) => {
          const active = selectedId === intent.id;
          return (
            <button
              key={intent.id}
              type="button"
              className={`pb-intent-card${active ? " pb-intent-card-active" : ""}`}
              disabled={disabled}
              onClick={() => onSelect(intent.id)}
            >
              <span className="pb-intent-card-label">{intent.label}</span>
              <span className="pb-intent-card-desc">{intent.description}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="pb-intent-freeform" onClick={onFreeForm} disabled={disabled}>
        Write your own brief
      </button>
      <style>{`
        .pb-intent-picker { width: 100%; max-width: 640px; padding: 8px 4px; }
        .pb-intent-picker-lead {
          font-size: 13px; font-weight: 600; color: rgba(22,22,28,0.55);
          margin: 0 0 12px; text-align: center;
        }
        .pb-intent-grid {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
        }
        @media (max-width: 520px) { .pb-intent-grid { grid-template-columns: 1fr; } }
        .pb-intent-card {
          text-align: left; padding: 12px 14px; border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.88);
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .pb-intent-card:hover:not(:disabled) {
          border-color: rgba(238,37,50,0.3);
          box-shadow: 0 6px 18px rgba(238,37,50,0.06);
        }
        .pb-intent-card-active {
          border-color: rgba(238,37,50,0.45);
          background: rgba(238,37,50,0.05);
          box-shadow: 0 6px 18px rgba(238,37,50,0.08);
        }
        .pb-intent-card:disabled { opacity: 0.5; cursor: not-allowed; }
        .pb-intent-card-label {
          display: block; font-size: 13px; font-weight: 700; color: rgba(22,22,28,0.9);
          margin-bottom: 4px;
        }
        .pb-intent-card-desc {
          display: block; font-size: 11.5px; line-height: 1.35; color: rgba(22,22,28,0.52);
        }
        .pb-intent-freeform {
          display: block; margin: 14px auto 0; font-size: 12px; font-weight: 600;
          color: rgba(22,22,28,0.45); text-decoration: underline; text-underline-offset: 3px;
        }
        .pb-intent-freeform:hover:not(:disabled) { color: #c41e2a; }
        .pb-intent-freeform:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
