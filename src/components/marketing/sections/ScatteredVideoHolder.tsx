"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  ScatteredListingReel,
  type ScatteredListingReelProps,
} from "@/remotion/scattered-listing-reel";

const RemotionPlayer = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  {
    ssr: false,
    loading: () => (
      <div
        className="scattered-video-loading"
        style={{
          width: "100%",
          height: "100%",
          background: "#f1f1f3",
        }}
      />
    ),
  },
);

const FPS = 30;
const DURATION_FRAMES = 90;
const COMPOSITION_WIDTH = 1080;
const COMPOSITION_HEIGHT = 1920;

type Props = {
  alt: string;
  posterSrc?: string;
};

export default function ScatteredVideoHolder({ alt, posterSrc = "" }: Props) {
  const listingInputProps = useMemo<ScatteredListingReelProps>(() => {
    const absoluteSrc =
      posterSrc.startsWith("http") || typeof window === "undefined"
        ? posterSrc
        : `${window.location.origin}${posterSrc}`;
    return { posterSrc: absoluteSrc };
  }, [posterSrc]);

  return (
    <div className="scattered-video-holder" role="group" aria-label={alt}>
      <RemotionPlayer
        component={ScatteredListingReel}
        inputProps={listingInputProps}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        compositionWidth={COMPOSITION_WIDTH}
        compositionHeight={COMPOSITION_HEIGHT}
        style={{ width: "100%", height: "100%" }}
        loop
        autoPlay
        initiallyMuted
        controls={false}
        clickToPlay={false}
      />
      <div className="scattered-video-chrome" aria-hidden>
        <div className="scattered-video-profile" />
        <div className="scattered-video-action">
          <span className="scattered-video-icon scattered-video-icon-heart" />
          <span className="scattered-video-count">30</span>
        </div>
        <div className="scattered-video-action">
          <span className="scattered-video-icon scattered-video-icon-comment" />
          <span className="scattered-video-count">0</span>
        </div>
        <div className="scattered-video-action">
          <span className="scattered-video-icon scattered-video-icon-save" />
          <span className="scattered-video-count">8</span>
        </div>
      </div>
    </div>
  );
}
