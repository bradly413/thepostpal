"use client";

import { useEffect, useRef, useState } from "react";

export type FeatureSlideAsset = {
  id: string;
  title: string;
  lead: string;
  desc: string;
  webm: string;
  mp4: string;
  poster: string;
};

type Props = {
  slides: readonly FeatureSlideAsset[];
  activeIndex: number;
  className?: string;
};

/**
 * Homepage feature video slideshow — muted autoplay, pause when inactive
 * or offscreen, poster fallback, reduced-motion safe.
 */
export default function FeatureSlideshow({ slides, activeIndex, className }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const shouldPlay = !reducedMotion && inView && i === activeIndex;
      if (shouldPlay) {
        video.currentTime = 0;
        void video.play().catch(() => {
          /* autoplay may fail — poster remains */
        });
      } else {
        video.pause();
      }
    });
  }, [activeIndex, inView, reducedMotion]);

  return (
    <div ref={rootRef} className={className} aria-hidden>
      {slides.map((slide, i) => {
        const active = i === activeIndex;
        return (
          <div
            key={slide.id}
            data-hero-img={i}
            className={`hero-arch-img hero-arch-img--fade${active ? " is-on" : ""}`}
          >
            {reducedMotion ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="hero-arch-media"
                src={slide.poster}
                alt=""
                decoding="async"
                loading={i === 0 ? "eager" : "lazy"}
              />
            ) : (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                className="hero-arch-media"
                poster={slide.poster}
                muted
                playsInline
                loop
                preload={active || i === 0 ? "metadata" : "none"}
                disablePictureInPicture
                controls={false}
              >
                <source src={slide.webm} type="video/webm" />
                <source src={slide.mp4} type="video/mp4" />
              </video>
            )}
          </div>
        );
      })}
    </div>
  );
}
