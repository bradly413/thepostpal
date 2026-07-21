"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const FRAMES = [
  { id: "schedule", src: "/marketing/product-demo/bulk-upload/01-schedule.jpg", alt: "Posterboy Schedule" },
  { id: "modal", src: "/marketing/product-demo/bulk-upload/02-modal.jpg", alt: "Bulk Upload modal" },
  { id: "uploading", src: "/marketing/product-demo/bulk-upload/03-uploading.jpg", alt: "Uploading photos" },
  { id: "loaded", src: "/marketing/product-demo/bulk-upload/04-loaded.jpg", alt: "Eight posts loaded" },
  { id: "queue", src: "/marketing/product-demo/bulk-upload/05-queue.jpg", alt: "Bulk queue with eight posts" },
] as const;

const QUEUE_ROWS = 8;

type Props = {
  active?: boolean;
  className?: string;
};

/**
 * Fixed product-window demo: Schedule → Bulk Upload → queue.
 * Outer frame stays still; only inner UI states crossfade.
 */
export default function BulkUploadFeatureAnimation({
  active = true,
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLParagraphElement | null>(null);
  const captionRef = useRef<HTMLParagraphElement | null>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const counterObj = useRef({ n: 0 });

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const inViewRef = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const [counterText, setCounterText] = useState("Uploading 0 of 8…");

  const syncPlayback = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (activeRef.current && inViewRef.current) {
      if (tl.paused()) tl.play();
    } else {
      tl.pause();
    }
  };

  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const frames = frameRefs.current.filter(Boolean) as HTMLDivElement[];
      const rows = rowRefs.current.filter(Boolean) as HTMLDivElement[];
      const counterEl = counterRef.current;
      const captionEl = captionRef.current;
      if (!root || !stage || frames.length !== FRAMES.length) return;

      const mm = gsap.matchMedia();

      const showFinal = () => {
        gsap.set(frames, { autoAlpha: 0, scale: 1 });
        gsap.set(frames[4], { autoAlpha: 1, scale: 1 });
        gsap.set(rows, { autoAlpha: 0 });
        if (counterEl) gsap.set(counterEl, { autoAlpha: 0 });
        if (captionEl) gsap.set(captionEl, { autoAlpha: 1 });
        setCounterText("Uploading 8 of 8…");
      };

      mm.add("(prefers-reduced-motion: reduce)", () => {
        showFinal();
        return () => {
          tlRef.current?.kill();
          tlRef.current = null;
        };
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(frames, {
          autoAlpha: 0,
          scale: 1,
          transformOrigin: "50% 50%",
          willChange: "transform, opacity",
        });
        gsap.set(frames[0], { autoAlpha: 1, scale: 1 });
        gsap.set(rows, { autoAlpha: 0 });
        if (counterEl) gsap.set(counterEl, { autoAlpha: 0 });
        if (captionEl) gsap.set(captionEl, { autoAlpha: 0 });
        counterObj.current.n = 0;
        setCounterText("Uploading 0 of 8…");

        const tl = gsap.timeline({
          paused: true,
          repeat: -1,
          repeatDelay: 1.4,
        });
        tlRef.current = tl;

        const crossfade = (from: number, to: number, at: string, push = 1.025) => {
          tl.to(
            frames[from],
            { autoAlpha: 0, scale: 1, duration: 0.45, ease: "power3.inOut" },
            at,
          );
          tl.fromTo(
            frames[to],
            { autoAlpha: 0, scale: 1.02 },
            { autoAlpha: 1, scale: push, duration: 0.55, ease: "power3.inOut" },
            at,
          );
          tl.to(
            frames[to],
            { scale: 1, duration: 0.5, ease: "power3.inOut" },
            `${at}+=0.35`,
          );
        };

        // 0–1s: Schedule
        tl.addLabel("schedule");
        tl.to({}, { duration: 1.0 }, "schedule");

        // 1–2s: Bulk Upload modal
        tl.addLabel("modal", "schedule+=1.0");
        crossfade(0, 1, "modal", 1.02);

        // 2–3s: Uploading + counter 0→8
        tl.addLabel("uploading", "modal+=1.0");
        crossfade(1, 2, "uploading", 1.02);
        if (counterEl) {
          tl.set(counterEl, { autoAlpha: 1 }, "uploading+=0.35");
          counterObj.current.n = 0;
          tl.to(
            counterObj.current,
            {
              n: 8,
              duration: 1.0,
              ease: "power2.inOut",
              onUpdate: () => {
                setCounterText(`Uploading ${Math.round(counterObj.current.n)} of 8…`);
              },
            },
            "uploading+=0.4",
          );
        }

        // 3–5s: Eight posts loaded
        tl.addLabel("loaded", "uploading+=1.15");
        if (counterEl) {
          tl.to(counterEl, { autoAlpha: 0, duration: 0.25, ease: "power2.out" }, "loaded");
        }
        crossfade(2, 3, "loaded", 1.03);
        tl.to({}, { duration: 0.85 }, "loaded+=0.7");

        // 5–7s: Bulk Queue + row stagger
        tl.addLabel("queue", "loaded+=1.55");
        crossfade(3, 4, "queue", 1.02);
        // Cover rows, then peel away so the list staggers in
        tl.set(rows, { autoAlpha: 1 }, "queue+=0.2");
        tl.to(
          rows,
          {
            autoAlpha: 0,
            duration: 0.28,
            stagger: 0.06,
            ease: "power3.inOut",
          },
          "queue+=0.45",
        );

        // Hold: “8 posts. One upload.”
        tl.addLabel("hold", "queue+=1.4");
        if (captionEl) {
          tl.to(captionEl, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, "hold");
        }
        tl.to({}, { duration: 2.6 }, "hold+=0.2");

        // Invisible reset
        tl.addLabel("reset");
        tl.set(frames, { autoAlpha: 0, scale: 1 }, "reset");
        tl.set(frames[0], { autoAlpha: 1, scale: 1 }, "reset");
        tl.set(rows, { autoAlpha: 0 }, "reset");
        if (counterEl) tl.set(counterEl, { autoAlpha: 0 }, "reset");
        if (captionEl) tl.set(captionEl, { autoAlpha: 0 }, "reset");
        tl.add(() => {
          counterObj.current.n = 0;
          setCounterText("Uploading 0 of 8…");
        }, "reset");

        syncPlayback();

        return () => {
          tl.kill();
          if (tlRef.current === tl) tlRef.current = null;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [] },
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    syncPlayback();
  }, [active]);

  return (
    <div
      ref={rootRef}
      className={`pdemo${className ? ` ${className}` : ""}`}
      aria-label="Posterboy bulk upload product demonstration"
    >
      <div className="pdemo-frame">
        <div className="pdemo-stage" ref={stageRef}>
          {FRAMES.map((frame, i) => (
            <div
              key={frame.id}
              className={`pdemo-frame-layer pdemo-frame-layer--${frame.id}`}
              ref={(node) => {
                frameRefs.current[i] = node;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frame.src} alt="" draggable={false} />
            </div>
          ))}

          {/* Covers queue rows; fade out to stagger-reveal the list */}
          <div className="pdemo-row-masks" aria-hidden>
            {Array.from({ length: QUEUE_ROWS }, (_, i) => (
              <div
                key={i}
                className="pdemo-row-mask"
                ref={(node) => {
                  rowRefs.current[i] = node;
                }}
              />
            ))}
          </div>

          <p className="pdemo-counter" ref={counterRef} aria-hidden>
            {counterText}
          </p>
        </div>
      </div>

      <p className="pdemo-caption" ref={captionRef}>
        8 posts. One upload.
      </p>

      <style>{`
        .pdemo {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          background: transparent;
        }
        .pdemo-frame {
          width: min(100%, 720px);
          aspect-ratio: 16 / 10;
          border-radius: 18px;
          border: 1px solid rgba(20, 20, 24, 0.1);
          background: #f3f2ef;
          box-shadow:
            0 1px 2px rgba(20, 20, 24, 0.04),
            0 22px 48px -18px rgba(20, 20, 24, 0.22);
          overflow: hidden;
        }
        .pdemo-stage {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #eceae6;
        }
        .pdemo-frame-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          visibility: hidden;
        }
        .pdemo-frame-layer img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
          user-select: none;
          pointer-events: none;
        }
        .pdemo-row-masks {
          position: absolute;
          left: 50%;
          top: 26%;
          transform: translateX(-50%);
          width: min(52%, 340px);
          height: 52%;
          display: flex;
          flex-direction: column;
          gap: 2.2%;
          z-index: 3;
          pointer-events: none;
        }
        .pdemo-row-mask {
          flex: 1;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 0 0 1px rgba(20, 20, 24, 0.04);
        }
        .pdemo-counter {
          position: absolute;
          left: 50%;
          top: 52%;
          transform: translate(-50%, -50%);
          z-index: 4;
          margin: 0;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(20, 20, 24, 0.08);
          box-shadow: 0 10px 28px rgba(20, 20, 24, 0.12);
          font-family: var(--font-instrument-sans), Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(13px, 1.2vw, 15px);
          font-weight: 550;
          letter-spacing: -0.01em;
          color: #141418;
          white-space: nowrap;
          pointer-events: none;
        }
        .pdemo-caption {
          margin: 0;
          font-family: var(--font-instrument-sans), Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(15px, 1.35vw, 18px);
          font-weight: 550;
          letter-spacing: -0.02em;
          color: #141418;
          text-align: center;
        }

        @media (max-width: 900px) {
          .pdemo-frame {
            width: 100%;
            border-radius: 14px;
          }
          .pdemo-row-masks {
            width: min(58%, 280px);
            top: 28%;
            height: 48%;
          }
        }
      `}</style>
    </div>
  );
}
