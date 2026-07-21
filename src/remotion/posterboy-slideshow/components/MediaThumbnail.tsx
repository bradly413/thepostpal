import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PB } from "../theme";

type Props = {
  src: string;
  index: number;
  total?: number;
  appearAt?: number;
};

export const MediaThumbnail: React.FC<Props> = ({
  src,
  index,
  appearAt = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, frame - appearAt - index * 3);
  const enter = spring({
    frame: t,
    fps,
    config: { damping: 20, stiffness: 140 },
  });
  const opacity = interpolate(t, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 10,
        overflow: "hidden",
        border: `2px solid ${index === 0 ? PB.accent : "rgba(20,20,24,0.08)"}`,
        opacity,
        transform: `translateY(${(1 - enter) * 12}px) scale(${0.92 + enter * 0.08})`,
        background: "#eee",
        flexShrink: 0,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};
