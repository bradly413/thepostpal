"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCube, Navigation, Pagination, A11y, Keyboard } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/pagination";
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
  /** All carousel slides (when length > 1, cube Swiper is used). */
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

/** Media frame for the Schedule composer — cube Swiper when bulk-uploaded. */
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const showCarousel = mediaItems.length > 1;

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
      swiperRef.current.slideTo(carouselIndex, reduceMotion ? 0 : 450);
    }
  }, [carouselIndex, showCarousel, reduceMotion]);

  const carouselEffect = reduceMotion ? undefined : "cube";
  const carouselModules = reduceMotion
    ? [Navigation, Pagination, A11y, Keyboard]
    : [EffectCube, Navigation, Pagination, A11y, Keyboard];

  return (
    <div className="mb-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      <style>{`
        .pb-composer-swiper {
          width: 100%;
          height: 100%;
        }
        .pb-composer-swiper .swiper-slide {
          background: #f3f3f4;
          overflow: hidden;
        }
        .pb-composer-swiper .swiper-slide img,
        .pb-composer-swiper .swiper-slide video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pb-composer-swiper .swiper-pagination-bullet {
          background: rgba(255,255,255,0.55);
          opacity: 1;
        }
        .pb-composer-swiper .swiper-pagination-bullet-active {
          background: #ee2532;
        }
        .pb-composer-swiper .swiper-button-prev,
        .pb-composer-swiper .swiper-button-next {
          display: none;
        }
      `}</style>

      {!mediaUrl ? (
        <label
          className={`flex min-h-0 w-full flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 bg-[#f3f3f4] text-center shadow-[0_16px_36px_-18px_rgba(20,20,40,0.4),0_2px_8px_-4px_rgba(20,20,40,0.18)] ring-1 ring-black/[0.05] transition-colors hover:bg-[#ececed] ${
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
      ) : (
        <div className="relative min-h-0 w-full flex-1 shadow-[0_18px_42px_-16px_rgba(20,20,40,0.45),0_4px_12px_-6px_rgba(20,20,40,0.22)] ring-1 ring-black/[0.06]">
          <div className="absolute inset-0 overflow-hidden bg-[#f3f3f4]">
          {showCarousel ? (
            <Swiper
              className="pb-composer-swiper"
              modules={carouselModules}
              {...(carouselEffect ? { effect: carouselEffect, cubeEffect: { slideShadows: false } } : {})}
              speed={reduceMotion ? 0 : 550}
              loop={false}
              initialSlide={carouselIndex}
              keyboard={{ enabled: true }}
              pagination={{ clickable: true }}
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
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              aria-label="Post preview video"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt="Post preview photo"
              className="absolute inset-0 h-full w-full rounded-none object-cover"
            />
          )}

          {uploadingMedia && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-md">
              <span
                className="h-6 w-6 animate-spin rounded-full border-2 border-[#323232]/25 border-t-[#323232]"
                aria-hidden
              />
            </div>
          )}

          {!uploadingMedia && (
            <>
              <div className="absolute right-2.5 top-2.5 z-20 flex gap-1.5">
                <label className="cursor-pointer rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/70">
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
                  className="rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/70"
                >
                  Remove
                </button>
              </div>
              {showCarousel && (
                <>
                  <button
                    type="button"
                    className="pb-composer-prev absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/70"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="pb-composer-next absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/70"
                    aria-label="Next image"
                  >
                    <ChevronRight size={18} aria-hidden />
                  </button>
                  <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {carouselIndex + 1} / {mediaItems.length}
                  </div>
                </>
              )}
            </>
          )}
          </div>
        </div>
      )}
      {mediaError && (
        <p className="mt-1 shrink-0 text-center text-[11px] text-[#ee2532]">{mediaError}</p>
      )}
    </div>
  );
}
