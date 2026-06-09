"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export interface CaptionVariant {
  angle: string;
  caption: string;
  hashtags: string[];
}

interface Props {
  brief: string;
  platform: string;
  onSelect: (variant: CaptionVariant) => void;
  disabled?: boolean;
}

export default function CaptionVariantPicker({ brief, platform, onSelect, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<CaptionVariant[]>([]);

  async function generate() {
    const trimmed = brief.trim();
    if (!trimmed) {
      setError("Add a brief or prompt first.");
      return;
    }
    setLoading(true);
    setError(null);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/captions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: trimmed, platform, count: 3 }),
      });
      const data = (await res.json()) as { variants?: CaptionVariant[]; error?: string };
      if (!res.ok || !data.variants?.length) {
        setError(data.error || "Could not generate options. Try again.");
        return;
      }
      setVariants(data.variants);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-caption-variants">
      <button
        type="button"
        className="pb-caption-variants-trigger"
        onClick={() => void generate()}
        disabled={disabled || loading}
      >
        <Sparkles size={14} />
        {loading ? "Generating…" : "Generate options"}
      </button>

      {error ? <p className="pb-caption-variants-error">{error}</p> : null}

      {variants.length > 0 ? (
        <div className="pb-caption-variants-list">
          {variants.map((v, i) => (
            <button
              key={`${v.angle}-${i}`}
              type="button"
              className="pb-caption-variant-card"
              onClick={() => onSelect(v)}
            >
              <span className="pb-caption-variant-angle">{v.angle}</span>
              <p className="pb-caption-variant-text">{v.caption}</p>
              {v.hashtags.length > 0 ? (
                <p className="pb-caption-variant-tags">{v.hashtags.join(" ")}</p>
              ) : null}
              <span className="pb-caption-variant-use">Use this</span>
            </button>
          ))}
        </div>
      ) : null}

      <style>{`
        .pb-caption-variants { display: flex; flex-direction: column; gap: 8px; }
        .pb-caption-variants-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 10px; font-size: 12px; font-weight: 600;
          border: 1px solid rgba(238,37,50,0.25); background: rgba(238,37,50,0.06);
          color: #c41e2a; cursor: pointer; transition: background 0.15s;
        }
        .pb-caption-variants-trigger:hover:not(:disabled) { background: rgba(238,37,50,0.12); }
        .pb-caption-variants-trigger:disabled { opacity: 0.5; cursor: not-allowed; }
        .pb-caption-variants-error { font-size: 11.5px; color: #c41e2a; margin: 0; }
        .pb-caption-variants-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
        .pb-caption-variant-card {
          text-align: left; padding: 10px 12px; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.92);
          cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pb-caption-variant-card:hover {
          border-color: rgba(238,37,50,0.35);
          box-shadow: 0 4px 14px rgba(238,37,50,0.08);
        }
        .pb-caption-variant-angle {
          display: block; font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: rgba(22,22,28,0.45); margin-bottom: 4px;
        }
        .pb-caption-variant-text { font-size: 12.5px; line-height: 1.4; margin: 0 0 4px; color: rgba(22,22,28,0.88); }
        .pb-caption-variant-tags { font-size: 11px; color: #1d6fd6; margin: 0 0 6px; }
        .pb-caption-variant-use { font-size: 10px; font-weight: 600; color: #c41e2a; }
      `}</style>
    </div>
  );
}
