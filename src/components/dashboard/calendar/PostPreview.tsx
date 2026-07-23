"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCube, Navigation, A11y, Keyboard } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/navigation";

type Platform = "facebook" | "instagram" | "both";

export interface ComposerMediaItem {
  url: string;
  type: "image" | "video";
  /** Per-slide draft fields (bulk upload queue). */
  caption?: string;
  date?: string;
  time?: string;
}

interface PostPreviewProps {
  platform: Platform;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  accountName: string;
  avatarInitials: string;
  uploadingMedia: boolean;
  onPickFile: (file: File | undefined) => void;
  onRemove: () => void;
  mediaError?: string | null;
  /** All carousel slides (when length > 1, cube/slide Swiper is used). */
  mediaItems?: ComposerMediaItem[];
  carouselIndex?: number;
  onCarouselIndexChange?: (index: number) => void;
}

function mediaAltText(
  item: ComposerMediaItem,
  index: number,
  total: number,
): string {
  const kind = item.type === "video" ? "Video" : "Photo";
  const caption = item.caption?.trim();
  if (caption) return `${kind} ${index + 1} of ${total}: ${caption.slice(0, 80)}`;
  return `${kind} ${index + 1} of ${total} in post preview`;
}

/** Cube only feels good for a handful of slides — large queues stay slide. */
const CUBE_MAX = 6;

/**
 * Instagram portrait frame (4:5) that fills remaining composer height —
 * sized by available space, not width×aspect (which forced inner scroll).
 */
export default function PostPreview({
  mediaUrl,
  mediaType,
  uploadingMedia,
  onPickFile,
  onRemove,
  mediaError,
  mediaItems = [],
  carouselIndex = 0,
  onCarouselIndexChange,
}: PostPreviewProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const showCarousel = mediaItems.length > 1;
  const largeQueue = mediaItems.length > CUBE_MAX;
  const useCube = showCarousel && !largeQueue && !reduceMotion;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!showCarousel || !swiperRef.current) return;
    if (swiperRef.current.activeIndex !== carouselIndex) {
      swiperRef.current.slideTo(carouselIndex, reduceMotion ? 0 : 400);
    }
  }, [carouselIndex, showCarousel, reduceMotion]);

  // Keep the active thumb visible in the strip.
  useEffect(() => {
    if (!showCarousel || !stripRef.current) return;
    const active = stripRef.current.querySelector<HTMLElement>(
      `[data-thumb-index="${carouselIndex}"]`,
    );
    active?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [carouselIndex, showCarousel, reduceMotion]);

  const carouselModules = useCube
    ? [EffectCube, Navigation, A11y, Keyboard]
    : [Navigation, A11y, Keyboard];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <style>{`
        .pb-composer-preview-fit {
          container-type: size;
          position: relative;
          flex: 1 1 auto;
          min-height: min(48vh, 380px);
          width: 100%;
        }
        @media (min-width: 1024px) {
          .pb-composer-preview-fit {
            min-height: 0;
          }
        }
        .pb-composer-preview-fit__frame {
          position: absolute;
          inset: 0;
          margin: auto;
          aspect-ratio: 4 / 5;
          width: min(100%, calc(100cqh * 4 / 5));
          height: min(100%, calc(100cqw * 5 / 4));
          max-width: 100%;
          max-height: 100%;
        }
        .pb-composer-swiper,
        .pb-composer-swiper .swiper-wrapper {
          width: 100%;
          height: 100%;
        }
        .pb-composer-swiper .swiper-slide {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100% !important;
          background: #111;
          overflow: hidden;
        }
        .pb-composer-swiper .swiper-slide img,
        .pb-composer-swiper .swiper-slide video {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          object-position: center;
          background: #111;
        }
        .pb-composer-swiper .swiper-button-prev,
        .pb-composer-swiper .swiper-button-next {
          display: none;
        }
        .pb-composer-thumbs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scroll-snap-type: x proximity;
          padding: 2px 1px 2px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .pb-composer-thumbs::-webkit-scrollbar { display: none; }
        .pb-composer-thumbs > button { scroll-snap-align: center; }
        @media (pointer: coarse) {
          .pb-composer-nav {
            width: 2.75rem;
            height: 2.75rem;
          }
        }
      `}</style>

      {!mediaUrl ? (
        <div className="pb-composer-preview-fit">
          <label
            className={`pb-composer-preview-fit__frame flex cursor-pointer flex-col items-center justify-center gap-1.5 bg-[#f3f3f4] text-center shadow-[0_12px_28px_-18px_rgba(20,20,40,0.35)] ring-1 ring-black/[0.05] transition-colors hover:bg-[#ececed] ${
              uploadingMedia ? "pointer-events-none" : ""
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ee2532]/12 text-xl font-light leading-none text-[#ee2532]">
              +
            </span>
            <span className="text-sm font-medium text-black/55">Add a photo or video</span>
            <span className="text-[11px] text-black/35">Uploads to your secure bucket</span>
            <input
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0])}
              disabled={uploadingMedia}
            />
          </label>
        </div>
      ) : (
        <>
          <div className="pb-composer-preview-fit">
            <div
              className={`pb-composer-preview-fit__frame overflow-hidden bg-[#111] ring-1 ring-black/[0.06] ${
                largeQueue
                  ? "shadow-[0_10px_28px_-16px_rgba(20,20,40,0.35)]"
                  : "shadow-[0_18px_42px_-16px_rgba(20,20,40,0.45),0_4px_12px_-6px_rgba(20,20,40,0.22)]"
              }`}
            >
              {showCarousel ? (
                <Swiper
                  key={useCube ? "cube" : "slide"}
                  className="pb-composer-swiper absolute inset-0"
                  modules={carouselModules}
                  {...(useCube
                    ? { effect: "cube" as const, cubeEffect: { slideShadows: false } }
                    : {})}
                  speed={reduceMotion ? 0 : largeQueue ? 320 : 500}
                  loop={false}
                  initialSlide={carouselIndex}
                  keyboard={{ enabled: true }}
                  navigation={{
                    nextEl: ".pb-composer-next",
                    prevEl: ".pb-composer-prev",
                  }}
                  onSwiper={(s) => {
                    swiperRef.current = s;
                  }}
                  onSlideChange={(s) => {
                    if (s.activeIndex !== carouselIndex) {
                      onCarouselIndexChange?.(s.activeIndex);
                    }
                  }}
                >
                  {mediaItems.map((item, i) => (
                    <SwiperSlide key={`${item.url}-${i}`}>
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          aria-label={mediaAltText(item, i, mediaItems.length)}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={mediaAltText(item, i, mediaItems.length)}
                        />
                      )}
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  className="absolute inset-0 h-full w-full object-contain object-center"
                  muted
                  playsInline
                  aria-label="Post preview video"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt="Post preview photo"
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
              )}

              {uploadingMedia && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-md">
                  <span
                    className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                </div>
              )}

              {!uploadingMedia && (
                <>
                  <div className="absolute right-2 top-2 z-20 flex gap-1.5">
                    <label className="cursor-pointer rounded-lg bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/65">
                      Change
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="sr-only"
                        onChange={(e) => onPickFile(e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={onRemove}
                      className="rounded-lg bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/65"
                    >
                      Remove
                    </button>
                  </div>
                  {showCarousel && (
                    <>
                      <button
                        type="button"
                        className="pb-composer-prev pb-composer-nav absolute left-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="pb-composer-next pb-composer-nav absolute right-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
                        aria-label="Next image"
                      >
                        <ChevronRight size={16} aria-hidden />
                      </button>
                      <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur">
                        {carouselIndex + 1} / {mediaItems.length}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {showCarousel && (
            <div
              ref={stripRef}
              className="pb-composer-thumbs mt-2 shrink-0"
              role="listbox"
              aria-label="Post queue"
            >
              {mediaItems.map((item, i) => {
                const active = i === carouselIndex;
                return (
                  <button
                    key={`thumb-${item.url}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-thumb-index={i}
                    onClick={() => onCarouselIndexChange?.(i)}
                    className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 transition-[box-shadow,opacity] ${
                      active
                        ? "ring-2 ring-[#ee2532] ring-offset-1 ring-offset-white"
                        : "ring-black/10 opacity-75 hover:opacity-100"
                    }`}
                    title={`Post ${i + 1} of ${mediaItems.length}`}
                  >
                    {item.type === "video" ? (
                      <video
                        src={item.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {mediaError && (
        <p className="mt-1.5 shrink-0 text-center text-[11px] text-[#ee2532]">{mediaError}</p>
      )}
    </div>
  );
}
