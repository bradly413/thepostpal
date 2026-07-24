"use client";

import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { AnimatedOverlay } from "@/components/dashboard/AnimatedOverlay";

export default function StudioImageLightbox({
  open,
  src,
  imageStyle,
  onClose,
}: {
  open: boolean;
  src: string;
  imageStyle?: CSSProperties;
  onClose: () => void;
}) {
  return (
    <AnimatedOverlay
      open={open}
      onClose={onClose}
      ariaLabel="Generated image preview"
      zIndexClass="z-[100]"
      backdropClassName="bg-black/80 backdrop-blur-md"
      panelClassName="pointer-events-none relative flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1600px] items-center justify-center overflow-hidden outline-none sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
    >
      <button
        type="button"
        aria-label="Close image preview"
        onClick={onClose}
        className="pointer-events-auto absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/95 text-black shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X size={20} strokeWidth={2} aria-hidden />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Full-size generated studio image"
        data-studio-image-lightbox="true"
        draggable={false}
        style={imageStyle}
        className="pointer-events-auto block max-h-[calc(100dvh-3rem)] max-w-[calc(100vw-2rem)] select-none rounded-[10px] bg-white object-contain shadow-[0_30px_90px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-4rem)] sm:max-w-[calc(100vw-4rem)]"
      />
    </AnimatedOverlay>
  );
}
