import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { FeatureSlide } from "../components/FeatureSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { CaptionWriter } from "../components/CaptionWriter";
import { InterfaceCallout } from "../components/InterfaceCallout";
import { clean } from "../theme";

const CAPTION_A =
  "When they want to order something — make sure it's you. Fresh plates, loud flavors, open late.";
const CAPTION_B =
  "Brunch hit different. Berries, syrup, and a table worth posting about.";

/**
 * Auto Caption — image understanding + brand-aware writing.
 */
export const AutoCaption: React.FC = () => {
  const frame = useCurrentFrame();

  const fade = (local: number, dur: number) =>
    interpolate(local, [0, 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(local, [dur - 10, dur], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // Subtle scan line over image during analysis
  const scanY = interpolate(frame, [36, 75], [18, 72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <FeatureSlide
      eyebrow="Auto Caption"
      title="Captions that already sound like you."
      support="Posterboy analyzes every image and writes a caption shaped around your brand."
      payoff="Every image gets its own caption."
      payoffAt={204}
    >
      {/* A. Image selected */}
      <Sequence from={0} durationInFrames={36} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame, 36) }}>
          <ScreenshotFrame src={clean(9)} focusX={30} focusY={48} scale={1.2} zoomTo={1.26} />
        </AbsoluteFill>
      </Sequence>

      {/* B. Image analysis */}
      <Sequence from={30} durationInFrames={45} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 30, 45) }}>
          <ScreenshotFrame src={clean(14)} focusX={30} focusY={50} scale={1.18} />
          <div
            style={{
              position: "absolute",
              left: "8%",
              width: "38%",
              top: `${scanY}%`,
              height: 3,
              background: "rgba(238,37,50,0.55)",
              boxShadow: "0 0 18px rgba(238,37,50,0.35)",
              zIndex: 4,
            }}
          />
          <InterfaceCallout
            label="Analyzing image & writing captions…"
            bottom={140}
            left={72}
            appearAt={6}
          />
        </AbsoluteFill>
      </Sequence>

      {/* C. Caption writing */}
      <Sequence from={70} durationInFrames={56} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 70, 56) }}>
          <ScreenshotFrame src={clean(12)} focusX={30} focusY={48} scale={1.16} />
          <CaptionWriter text={CAPTION_A} appearAt={8} />
        </AbsoluteFill>
      </Sequence>

      {/* D. Brand matching / rewrite affordance */}
      <Sequence from={120} durationInFrames={45} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 120, 45) }}>
          <ScreenshotFrame src={clean(10)} focusX={30} focusY={52} scale={1.14} />
          <InterfaceCallout label="Rewrite caption" top={260} right={80} appearAt={8} />
          <InterfaceCallout label="Sounds like your brand" bottom={120} left={72} appearAt={16} />
        </AbsoluteFill>
      </Sequence>

      {/* E. Multiple posts */}
      <Sequence from={158} durationInFrames={46} layout="none">
        <AbsoluteFill style={{ opacity: fade(frame - 158, 46) }}>
          <ScreenshotFrame
            src={frame - 158 < 22 ? clean(11) : clean(13)}
            focusX={30}
            focusY={50}
            scale={1.16}
          />
          <CaptionWriter
            text={frame - 158 < 22 ? CAPTION_A : CAPTION_B}
            appearAt={4}
            charsPerFrame={2.2}
          />
        </AbsoluteFill>
      </Sequence>

      {/* F. Final */}
      <Sequence from={196} durationInFrames={44} layout="none">
        <AbsoluteFill>
          <ScreenshotFrame src={clean(13)} focusX={30} focusY={48} scale={1.14} />
          <CaptionWriter text={CAPTION_B} appearAt={0} charsPerFrame={8} />
        </AbsoluteFill>
      </Sequence>
    </FeatureSlide>
  );
};
