import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { PB } from "../theme";

type Props = {
  progress: number; // 0-1
  size?: number;
  label?: string;
};

export const ProgressRing: React.FC<Props> = ({
  progress,
  size = 72,
  label,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, progress));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 14,
        opacity,
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(20,20,24,0.1)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={PB.accent}
          strokeWidth={6}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>
      {label ? (
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: PB.ink,
            background: "rgba(255,255,255,0.92)",
            padding: "8px 14px",
            borderRadius: 8,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
