import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame } from "remotion";
import { BulkUpload } from "./BulkUpload";
import { CreatorStudio } from "./CreatorStudio";
import { AutoCaption } from "./AutoCaption";
import { SLIDE_DURATION } from "../theme";

const TRANSITION = 12;

/** Combined review composition: Bulk → Studio → Caption */
export const PosterboySlideshow: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#f7f4ee" }}>
      <Series>
        <Series.Sequence durationInFrames={SLIDE_DURATION}>
          <BulkUpload />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SLIDE_DURATION} offset={-TRANSITION}>
          <FadeBridge>
            <CreatorStudio />
          </FadeBridge>
        </Series.Sequence>
        <Series.Sequence durationInFrames={SLIDE_DURATION} offset={-TRANSITION}>
          <FadeBridge>
            <AutoCaption />
          </FadeBridge>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

const FadeBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, TRANSITION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
