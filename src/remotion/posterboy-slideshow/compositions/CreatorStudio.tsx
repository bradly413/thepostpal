import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { FeatureSlide } from "../components/FeatureSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { PlatformPreview } from "../components/PlatformPreview";
import { InterfaceCallout } from "../components/InterfaceCallout";
import { clean } from "../theme";

/**
 * Creator Studio — ready-to-post creative from uploaded content.
 * Uses real Schedule Create Posts surfaces from the supplied screenshots.
 */
export const CreatorStudio: React.FC = () => {
  const frame = useCurrentFrame();

  const fade = (local: number, dur: number) => {
    const f = 10;
    return (
      interpolate(local, [0, f], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }) *
      interpolate(local, [dur - f, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
  };

  return (
    <FeatureSlide
      eyebrow="Creator Studio"
      title="Turn raw content into ready-to-post creative."
      support="Create, refine, and preview every post from one intelligent studio built around your brand."
      payoff="From raw content to ready to post."
      payoffAt={204}
    >
      {/* A. Source content */}
      <Sequence from={0} durationInFrames={40} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame, 40) }}>
          <ScreenshotFrame
            src={clean(6)}
            focusX={30}
            focusY={48}
            scale={1.35}
            zoomTo={1.42}
          />
        </AbsoluteFill>
      </Sequence>

      {/* B. Studio / create controls */}
      <Sequence from={36} durationInFrames={54} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 36, 54) }}>
          <ScreenshotFrame
            src={clean(9)}
            focusX={28}
            focusY={40}
            scale={1.2}
            zoomTo={1.26}
          />
          <InterfaceCallout label="Bulk Upload +" top={210} left={90} appearAt={8} />
        </AbsoluteFill>
      </Sequence>

      {/* C. Creative transformation — design variations */}
      <Sequence from={84} durationInFrames={70} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 84, 70) }}>
          <ScreenshotFrame
            src={frame - 84 < 28 ? clean(7) : frame - 84 < 48 ? clean(10) : clean(12)}
            focusX={30}
            focusY={42}
            scale={1.28}
            zoomTo={1.34}
          />
        </AbsoluteFill>
      </Sequence>

      {/* D. Platform preview */}
      <Sequence from={148} durationInFrames={50} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 148, 50) }}>
          <ScreenshotFrame src={clean(11)} focusX={32} focusY={45} scale={1.18} />
          <PlatformPreview appearAt={8} />
        </AbsoluteFill>
      </Sequence>

      {/* E. Final */}
      <Sequence from={190} durationInFrames={50} layout="none">
        <AbsoluteFill>
          <ScreenshotFrame src={clean(13)} focusX={30} focusY={44} scale={1.22} />
        </AbsoluteFill>
      </Sequence>
    </FeatureSlide>
  );
};
