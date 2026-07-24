"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { coverflowRole, type CoverflowRole } from "@/lib/studio/coverflow";

export type CoverflowSlide = {
  /** Image URL when ready; null = still generating / placeholder. */
  url: string | null;
  label?: string;
};

type Props = {
  slides: CoverflowSlide[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  aspectRatio?: string;
  className?: string;
};

export default function StudioCoverflow({
  slides,
  selectedIndex,
  onSelect,
  aspectRatio = "4 / 5",
  className = "",
}: Props) {
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const total = slides.length;
  const safeSelected = Math.min(Math.max(0, selectedIndex), Math.max(0, total - 1));

  const move = useCallback(
    (dir: "prev" | "next") => {
      if (total < 2) return;
      if (dir === "next") onSelect(Math.min(total - 1, safeSelected + 1));
      else onSelect(Math.max(0, safeSelected - 1));
    },
    [onSelect, safeSelected, total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Only claim the arrows when focus is inside this carousel — a document-
      // wide handler hijacked arrow keys page-wide whenever any coverflow was
      // mounted, breaking normal arrow behavior for every other control.
      const root = rootRef.current;
      if (!root || !root.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move("prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        move("next");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [move]);

  if (total === 0) return null;

  return (
    <div
      ref={rootRef}
      className={`studio-coverflow${className ? ` ${className}` : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="sr-only">
        Carousel slides. Use left and right arrows or the buttons to browse.
      </p>
      <div className="studio-coverflow-track" aria-live="polite">
        {slides.map((slide, i) => {
          const role: CoverflowRole = coverflowRole(i, safeSelected);
          const isSelected = role === "selected";
          return (
            <button
              key={`slide-${i}`}
              type="button"
              className={`studio-coverflow-slide ${role}`}
              data-role={role}
              aria-label={`Slide ${i + 1} of ${total}${slide.url ? "" : ", generating"}`}
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(i)}
              style={{ ["--cf-aspect" as string]: aspectRatio }}
            >
              {slide.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.url} alt="" draggable={false} />
              ) : (
                <span className="studio-coverflow-skeleton" aria-hidden>
                  <span className="studio-coverflow-skel-pulse" />
                </span>
              )}
              {isSelected ? (
                <span className="studio-coverflow-badge">
                  {i + 1} / {total}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {total > 1 ? (
        <div className="studio-coverflow-buttons">
          <button
            type="button"
            className="studio-coverflow-nav"
            onClick={() => move("prev")}
            disabled={safeSelected <= 0}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
            <span>Prev</span>
          </button>
          <button
            type="button"
            className="studio-coverflow-nav"
            onClick={() => move("next")}
            disabled={safeSelected >= total - 1}
            aria-label="Next slide"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
