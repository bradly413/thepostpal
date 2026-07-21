import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { PB } from "../theme";

type Props = {
  platforms?: Array<"facebook" | "instagram">;
  appearAt?: number;
};

export const PlatformPreview: React.FC<Props> = ({
  platforms = ["facebook", "instagram"],
  appearAt = 0,
}) => {
  const frame = useCurrentFrame();
  const t = frame - appearAt;
  const opacity = interpolate(t, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        right: 72,
        display: "flex",
        gap: 10,
        opacity,
        zIndex: 5,
      }}
    >
      {platforms.map((p) => (
        <div
          key={p}
          style={{
            background: PB.ink,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "10px 14px",
            borderRadius: 999,
          }}
        >
          {p === "facebook" ? "Facebook" : "Instagram"}
        </div>
      ))}
    </div>
  );
};
