"use client";

import { useEffect, useState } from "react";

/**
 * FlipWords — rotating word where each letter flips on a 3D X-axis,
 * staggered left-to-right (the classic "Nachos are tasty/wonderful/…"
 * CodePen technique, rebuilt declaratively: the outgoing word animates
 * rotateX 0→90 while the incoming flips -90→0, per-letter delays).
 *
 * The CURRENT word sits in normal flow (the line reflows naturally per
 * word length); the outgoing word overlays absolutely during its exit.
 * prefers-reduced-motion: words swap with no flip.
 *
 * Usage:
 *   make a <FlipWords words={["instagram","facebook"]} colors={{instagram:"#C13584"}} /> post about…
 */
export default function FlipWords({
  words,
  colors = {},
  interval = 4500,
}: {
  words: string[];
  /** optional per-word color */
  colors?: Record<string, string>;
  interval?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setIdx((i) => {
        setPrev(i);
        return (i + 1) % words.length;
      });
    }, interval);
    return () => window.clearInterval(t);
  }, [words.length, interval]);

  const letters = (wi: number, mode: "in" | "out" | "static") => (
    <span
      key={`${words[wi]}-${mode}-${idx}`}
      className={`fw-word fw-${mode}`}
      style={{ color: colors[words[wi]] }}
    >
      {words[wi].split("").map((ch, i) => (
        <span
          key={i}
          className="fw-letter"
          style={
            mode === "static"
              ? undefined
              : { animationDelay: mode === "in" ? `${420 + i * 85}ms` : `${i * 85}ms` }
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );

  return (
    <span className="fw-slot">
      {reduce ? (
        letters(idx, "static")
      ) : (
        <>
          {prev !== null && prev !== idx ? letters(prev, "out") : null}
          {letters(idx, prev === null ? "static" : "in")}
        </>
      )}
      <style>{`
        .fw-slot { position: relative; display: inline-block; perspective: 320px; white-space: nowrap; }
        .fw-word { display: inline-block; white-space: nowrap; }
        .fw-word.fw-out { position: absolute; left: 0; top: 0; }
        .fw-letter {
          display: inline-block;
          transform-origin: 50% 50% 12px;
          backface-visibility: hidden;
        }
        .fw-in .fw-letter {
          transform: rotateX(-90deg);
          animation: fwIn 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .fw-out .fw-letter {
          animation: fwOut 0.45s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
        }
        @keyframes fwIn { from { transform: rotateX(-90deg); } to { transform: rotateX(0deg); } }
        @keyframes fwOut { from { transform: rotateX(0deg); } to { transform: rotateX(90deg); } }
      `}</style>
    </span>
  );
}
