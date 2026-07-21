import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { FeatureSlide } from "../components/FeatureSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { CursorHighlight } from "../components/CursorHighlight";
import { ProgressRing } from "../components/ProgressRing";
import { InterfaceCallout } from "../components/InterfaceCallout";
import { clean } from "../theme";

/**
 * Bulk Upload — 8s @ 30fps
 * A schedule → B choose → C progress → D nine posts → E queue → F payoff
 */
export const BulkUpload: React.FC = () => {
  const frame = useCurrentFrame();

  // Crossfade helper between sequential beats within Sequence windows
  const beatOpacity = (localStart: number, localEnd: number, f: number) => {
    const fade = 8;
    return (
      interpolate(f, [localStart, localStart + fade], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }) *
      interpolate(f, [localEnd - fade, localEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
  };

  const uploadProgress = interpolate(frame, [54, 90], [0.33, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const uploadLabel =
    frame < 66 ? "Uploading 3 of 9…" : frame < 78 ? "Uploading 6 of 9…" : "Uploading 8 of 9…";

  return (
    <FeatureSlide
      eyebrow="Bulk Upload"
      title="Upload a month of content in minutes."
      support="Upload your content once. Posterboy turns it into an organized publishing queue."
      payoff="9 posts. One upload."
      payoffAt={189}
    >
      {/* A. Schedule workspace 0–24f */}
      <Sequence from={0} durationInFrames={28} layout="none">
        <AbsoluteFill style={{ opacity: beatOpacity(0, 28, frame) }}>
          <ScreenshotFrame
            src={clean(6)}
            focusX={38}
            focusY={42}
            scale={1.08}
            zoomTo={1.14}
          />
        </AbsoluteFill>
      </Sequence>

      {/* B. Choose photos 24–54 */}
      <Sequence from={24} durationInFrames={34} layout="none">
        <AbsoluteFill style={{ opacity: beatOpacity(0, 34, frame - 24) }}>
          <ScreenshotFrame src={clean(1)} focusX={50} focusY={48} scale={1.05} zoomTo={1.1} />
          <CursorHighlight x={960} y={560} appearAt={6} label="Choose photos" />
        </AbsoluteFill>
      </Sequence>

      {/* C. Upload progress 54–90 */}
      <Sequence from={54} durationInFrames={40} layout="none">
        <AbsoluteFill style={{ opacity: beatOpacity(0, 40, frame - 54) }}>
          <ScreenshotFrame
            src={frame < 66 ? clean(3) : frame < 78 ? clean(4) : clean(5)}
            focusX={50}
            focusY={48}
            scale={1.06}
          />
          <ProgressRing progress={uploadProgress} label={uploadLabel} />
        </AbsoluteFill>
      </Sequence>

      {/* D. Nine posts created 90–141 */}
      <Sequence from={90} durationInFrames={55} layout="none">
        <AbsoluteFill style={{ opacity: beatOpacity(0, 55, frame - 90) }}>
          <ScreenshotFrame
            src={clean(6)}
            focusX={32}
            focusY={55}
            scale={1.18}
            zoomTo={1.24}
          />
          <InterfaceCallout label="1 / 9 in queue" top={220} left={72} appearAt={10} />
        </AbsoluteFill>
      </Sequence>

      {/* E. Organized queue 141–189 */}
      <Sequence from={141} durationInFrames={52} layout="none">
        <AbsoluteFill style={{ opacity: beatOpacity(0, 52, frame - 141) }}>
          <ScreenshotFrame
            src={clean(8)}
            focusX={50}
            focusY={interpolate(frame - 141, [0, 48], [38, 58], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            scale={1.12}
            y={interpolate(frame - 141, [0, 48], [0, -40], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        </AbsoluteFill>
      </Sequence>

      {/* F. Final payoff hold 189–240 */}
      <Sequence from={189} durationInFrames={51} layout="none">
        <AbsoluteFill>
          <ScreenshotFrame src={clean(7)} focusX={34} focusY={50} scale={1.12} />
        </AbsoluteFill>
      </Sequence>
    </FeatureSlide>
  );
};
