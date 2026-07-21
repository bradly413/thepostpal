import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

export type ScreenshotFrameProps = {
  src: string;
  /** object-position style focal point */
  focusX?: number;
  focusY?: number;
  scale?: number;
  x?: number;
  y?: number;
  opacity?: number;
  /** Animated Ken Burns over local duration */
  zoomTo?: number;
  borderRadius?: number;
};

export const ScreenshotFrame: React.FC<ScreenshotFrameProps> = ({
  src,
  focusX = 50,
  focusY = 45,
  scale = 1,
  x = 0,
  y = 0,
  opacity = 1,
  zoomTo,
  borderRadius = 0,
}) => {
  const frame = useCurrentFrame();
  const animatedScale =
    zoomTo != null
      ? interpolate(frame, [0, 60], [scale, zoomTo], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : scale;

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", borderRadius }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focusX}% ${focusY}%`,
          transform: `translate(${x}px, ${y}px) scale(${animatedScale})`,
          transformOrigin: `${focusX}% ${focusY}%`,
        }}
      />
    </AbsoluteFill>
  );
};
