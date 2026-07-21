import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type Props = {
  children: React.ReactNode;
  /** frames of fade at start/end */
  fade?: number;
};

/** Soft opacity bridge — no wipes. */
export const SlideTransition: React.FC<Props> = ({ children, fade = 12 }) => {
  const frame = useCurrentFrame();
  // duration unknown locally; parent Sequence defines window — fade in only from local 0
  const opacity = interpolate(frame, [0, fade], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
