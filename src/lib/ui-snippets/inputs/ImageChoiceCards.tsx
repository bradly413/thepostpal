"use client";

import type { CSSProperties } from "react";

/**
 * ImageChoiceCards — radio group as image cards.
 *
 * The hook: choices sit in GRAYSCALE until touched — hover previews color,
 * selecting commits it (color + brand ring + a soft mirror reflection below).
 * "Color = chosen" reads instantly, no copy needed.
 *
 * Converted from a CSS-only radio/label snippet Brad shared; fixed while porting:
 * - real focusable radios (sr-only) + :focus-visible ring → keyboard accessible
 * - reflection shown for the SELECTED card (hover previews it), not hover-only
 * - visible text label under each card (image-only choices fail non-obvious cases)
 * - reduced-motion: transitions collapse, reflection stays static
 *
 * Usage:
 *   <ImageChoiceCards
 *     name="vibe"
 *     value={vibe}
 *     onChange={setVibe}
 *     options={[{ id: "warm", label: "Warm & cozy", image: "/vibes/warm.jpg" }, …]}
 *   />
 */

export interface ImageChoiceOption {
  id: string;
  label: string;
  image: string; // url
}

export default function ImageChoiceCards({
  name,
  options,
  value,
  onChange,
  cardWidth = 200,
  cardHeight = 150,
}: {
  name: string;
  options: ImageChoiceOption[];
  value: string | null;
  onChange: (id: string) => void;
  cardWidth?: number;
  cardHeight?: number;
}) {
  return (
    <div className="pbicc" role="radiogroup">
      {options.map((opt) => {
        const checked = value === opt.id;
        const bg: CSSProperties = { backgroundImage: `url(${opt.image})` };
        return (
          <label key={opt.id} className={`pbicc-item${checked ? " is-checked" : ""}`}>
            <input
              type="radio"
              className="sr-only pbicc-input"
              name={name}
              value={opt.id}
              checked={checked}
              onChange={() => onChange(opt.id)}
            />
            <span
              className="pbicc-card"
              style={{ ...bg, width: cardWidth, height: cardHeight }}
            >
              <span className="pbicc-check" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </span>
            {/* mirror reflection — same image flipped, faded out with a mask */}
            <span
              className="pbicc-reflect"
              style={{ ...bg, width: cardWidth, height: cardHeight * 0.42 }}
              aria-hidden
            />
            <span className="pbicc-label">{opt.label}</span>
          </label>
        );
      })}

      <style>{`
        .pbicc { display: flex; flex-wrap: wrap; gap: 22px; justify-content: center; }
        .pbicc-item {
          position: relative; display: flex; flex-direction: column; align-items: center;
          cursor: pointer;
        }
        .pbicc-card {
          position: relative; display: block; border-radius: 14px;
          background-size: cover; background-position: center;
          filter: grayscale(1) opacity(0.78);
          transform: translateY(0);
          transition: filter 220ms ease, transform 220ms ease, box-shadow 220ms ease;
          box-shadow: 0 4px 14px rgba(0,0,0,0.10);
        }
        .pbicc-item:hover .pbicc-card {
          filter: grayscale(0) opacity(1);
          transform: translateY(-3px);
          box-shadow: 0 10px 26px rgba(0,0,0,0.16);
        }
        .pbicc-item.is-checked .pbicc-card {
          filter: grayscale(0) opacity(1);
          box-shadow: 0 10px 26px rgba(238,37,50,0.18), 0 0 0 2.5px #ee2532;
        }
        /* keyboard focus ring on the card (input is sr-only but focusable) */
        .pbicc-input:focus-visible ~ .pbicc-card {
          outline: 2px solid #ee2532; outline-offset: 3px;
        }
        .pbicc-check {
          position: absolute; top: 8px; right: 8px; width: 22px; height: 22px;
          border-radius: 50%; background: #ee2532; color: #fff;
          display: grid; place-items: center; padding: 4px;
          opacity: 0; transform: scale(0.6);
          transition: opacity 180ms ease, transform 180ms ease;
        }
        .pbicc-item.is-checked .pbicc-check { opacity: 1; transform: scale(1); }
        .pbicc-reflect {
          display: block; margin-top: 2px; border-radius: 14px 14px 0 0;
          background-size: cover; background-position: top center;
          transform: scaleY(-1);
          opacity: 0;
          -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.32), transparent 85%);
          mask-image: linear-gradient(to top, rgba(0,0,0,0.32), transparent 85%);
          transition: opacity 260ms ease;
          pointer-events: none;
        }
        .pbicc-item:hover .pbicc-reflect,
        .pbicc-item.is-checked .pbicc-reflect { opacity: 1; }
        .pbicc-label {
          margin-top: 6px; font-size: 13px; font-weight: 600; color: #76767e;
          transition: color 180ms ease;
        }
        .pbicc-item.is-checked .pbicc-label { color: #1c1c1e; }
        @media (prefers-reduced-motion: reduce) {
          .pbicc-card, .pbicc-check, .pbicc-reflect, .pbicc-label { transition: none; }
          .pbicc-item:hover .pbicc-card { transform: none; }
        }
      `}</style>
    </div>
  );
}
