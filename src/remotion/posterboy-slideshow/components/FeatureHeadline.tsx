import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PB } from "../theme";

type Props = {
  eyebrow?: string;
  title: string;
  support?: string;
  appearAt?: number;
};

export const FeatureHeadline: React.FC<Props> = ({
  eyebrow,
  title,
  support,
  appearAt = 0,
}) => {
  const frame = useCurrentFrame();
  const t = frame - appearAt;
  const opacity = interpolate(t, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(t, [0, 18], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        padding: "64px 72px",
        justifyContent: "flex-start",
        alignItems: "flex-start",
      }}
    >
      <div style={{ opacity, transform: `translateY(${y}px)`, maxWidth: 620 }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: PB.accent,
              marginBottom: 12,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 44,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: PB.ink,
            textShadow: "0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          {title}
        </div>
        {support ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 18,
              lineHeight: 1.4,
              color: PB.muted,
              maxWidth: 460,
            }}
          >
            {support}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
