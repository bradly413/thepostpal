import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PB } from "../theme";

type Props = {
  x: number;
  y: number;
  appearAt?: number;
  label?: string;
};

export const CursorHighlight: React.FC<Props> = ({
  x,
  y,
  appearAt = 0,
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, frame - appearAt);
  const pulse = spring({
    frame: t % 45,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const opacity = interpolate(t, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = 28 + pulse * 10;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        zIndex: 6,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -ring / 2,
          top: -ring / 2,
          width: ring,
          height: ring,
          borderRadius: 999,
          border: `2px solid ${PB.accent}`,
          background: "rgba(238,37,50,0.12)",
        }}
      />
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: PB.accent,
          boxShadow: "0 0 0 3px rgba(238,37,50,0.25)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {label ? (
        <div
          style={{
            marginTop: 18,
            marginLeft: 10,
            whiteSpace: "nowrap",
            background: PB.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            padding: "6px 10px",
            borderRadius: 6,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
