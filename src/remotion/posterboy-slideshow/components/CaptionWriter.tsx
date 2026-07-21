import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { PB } from "../theme";

type Props = {
  text: string;
  appearAt?: number;
  charsPerFrame?: number;
};

/** Deterministic caption reveal — not a chatbot bubble. */
export const CaptionWriter: React.FC<Props> = ({
  text,
  appearAt = 0,
  charsPerFrame = 1.4,
}) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - appearAt);
  const count = Math.min(text.length, Math.floor(t * charsPerFrame));
  const opacity = interpolate(t, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 96,
        opacity,
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(20,20,24,0.08)",
        borderRadius: 14,
        padding: "18px 20px",
        boxShadow: "0 16px 40px rgba(20,20,24,0.12)",
        zIndex: 5,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: PB.accent,
          marginBottom: 8,
        }}
      >
        Caption
      </div>
      <div
        style={{
          fontSize: 20,
          lineHeight: 1.4,
          color: PB.ink,
          fontWeight: 500,
          minHeight: 56,
        }}
      >
        {text.slice(0, count)}
        <span style={{ opacity: count < text.length ? 0.35 : 0 }}>|</span>
      </div>
    </div>
  );
};
