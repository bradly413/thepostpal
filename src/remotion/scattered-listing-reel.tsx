import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export type ScatteredListingReelProps = {
  posterSrc?: string;
};

export function ScatteredListingReel({ posterSrc = "" }: ScatteredListingReelProps) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 90], [1.04, 1.14], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 90], [0, -28], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0c0e" }}>
      <Img
        src={posterSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateY(${y}px)`,
        }}
      />
    </AbsoluteFill>
  );
}
