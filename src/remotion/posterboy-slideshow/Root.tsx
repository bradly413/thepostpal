import React from "react";
import { Composition } from "remotion";
import { BulkUpload } from "./compositions/BulkUpload";
import { CreatorStudio } from "./compositions/CreatorStudio";
import { AutoCaption } from "./compositions/AutoCaption";
import { PosterboySlideshow } from "./compositions/PosterboySlideshow";
import { HEIGHT, SLIDE_DURATION, SLIDE_FPS, WIDTH } from "./theme";

const COMBINED =
  SLIDE_DURATION * 3 - 12 * 2; // two 12-frame overlaps

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BulkUpload"
        component={BulkUpload}
        durationInFrames={SLIDE_DURATION}
        fps={SLIDE_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="CreatorStudio"
        component={CreatorStudio}
        durationInFrames={SLIDE_DURATION}
        fps={SLIDE_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="AutoCaption"
        component={AutoCaption}
        durationInFrames={SLIDE_DURATION}
        fps={SLIDE_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="PosterboySlideshow"
        component={PosterboySlideshow}
        durationInFrames={COMBINED}
        fps={SLIDE_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};
