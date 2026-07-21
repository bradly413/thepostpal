import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { PB } from "../theme";

type Props = {
  label: string;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  appearAt?: number;
};

export const InterfaceCallout: React.FC<Props> = ({
  label,
  top,
  left,
  right,
  bottom,
  appearAt = 0,
}) => {
  const frame = useCurrentFrame();
  const t = frame - appearAt;
  const opacity = interpolate(t, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(t, [0, 14], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        opacity,
        transform: `translateY(${y}px)`,
        background: PB.ink,
        color: "#fff",
        padding: "10px 14px",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        borderRadius: 8,
        boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
        zIndex: 5,
      }}
    >
      {label}
    </div>
  );
};
