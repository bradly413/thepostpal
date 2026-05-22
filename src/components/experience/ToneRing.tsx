"use client";

import { useRef, useState, useCallback } from "react";
import { TONE_OPTIONS } from "@/lib/experience/chapters";

interface ToneRingProps {
  onToneChange: (line: string) => void;
  disabled?: boolean;
}

export default function ToneRing({ onToneChange, disabled }: ToneRingProps) {
  const [holding, setHolding] = useState(false);
  const [activeTone, setActiveTone] = useState(0);
  const holdRef = useRef<number | null>(null);

  const startHold = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    let i = 0;
    onToneChange(TONE_OPTIONS[i].line);
    holdRef.current = window.setInterval(() => {
      i = (i + 1) % TONE_OPTIONS.length;
      setActiveTone(i);
      onToneChange(TONE_OPTIONS[i].line);
    }, 900);
  }, [disabled, onToneChange]);

  const endHold = useCallback(() => {
    setHolding(false);
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  const cx = 558.5;
  const cy = 352.5;

  return (
    <div className={`pb-xp-tone-ring ${disabled ? "disabled" : ""} ${holding ? "holding" : ""}`}>
      <p className="pb-xp-tone-hint">Click &amp; hold to change the tone</p>
      <div className="pb-xp-tone-ring-svg-wrap">
        <svg viewBox="0 0 1117 705" className="pb-xp-tone-svg" aria-hidden="true">
          <circle cx={cx} cy={cy} r={290.5} fill="none" stroke="rgba(17,17,17,0.08)" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={72.625} fill="none" stroke="rgba(17,17,17,0.12)" strokeWidth={1} />
          {TONE_OPTIONS.map((t, i) => {
            const angle = (i / TONE_OPTIONS.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * 290.5;
            const y = cy + Math.sin(angle) * 290.5;
            return (
              <text
                key={t.id}
                x={x}
                y={y}
                textAnchor="middle"
                className={`pb-xp-tone-label ${i === activeTone && holding ? "active" : ""}`}
              >
                {t.label}
              </text>
            );
          })}
        </svg>
        <button
          type="button"
          className="pb-xp-tone-orb"
          aria-label="Hold to change tone"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
        />
      </div>
      <p className="pb-xp-scroll-hint">Or keep scrolling</p>
    </div>
  );
}
