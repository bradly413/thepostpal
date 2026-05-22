import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import DashboardPreviewMock from "@/components/marketing/DashboardPreviewMock";

/** Crop the landscape dashboard mock into a 9:16 reel (hero + main column). */
const BASE_SCALE = 2.65;
const FOCUS_X = "-22%";

export function ScatteredDashboardReel() {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 90], [BASE_SCALE * 0.96, BASE_SCALE * 1.04], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 90], [18, -14], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f1f1f3",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <div
        style={{
          transform: `translateX(${FOCUS_X}) translateY(${y}px) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <DashboardPreviewMock />
      </div>
    </AbsoluteFill>
  );
}
