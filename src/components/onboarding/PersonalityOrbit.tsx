"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { type VoicePersonalityId } from "@/lib/voice-profile";
import { buildPersonalizedCaptions } from "@/lib/voice-sample-preview";

type Props = {
  value: VoicePersonalityId | null;
  onChange: (id: VoicePersonalityId) => void;
  onContinue: () => void;
  businessName?: string;
  whatYouDo?: string;
  where?: string;
  reducedMotion?: boolean;
};

/**
 * Voice personality picker — spotlight grid (warm-light).
 * Shows four niche-ranked voices; “See 2 more” reveals two additional options.
 */
export default function PersonalityOrbit({
  value,
  onChange,
  onContinue,
  businessName = "",
  whatYouDo = "",
  where = "",
  reducedMotion = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [showMore, setShowMore] = useState(false);

  const captions = buildPersonalizedCaptions({
    businessName,
    whatYouDo,
    where,
  });

  const INITIAL_COUNT = 4;
  const MORE_COUNT = 2;
  const visible = captions.slice(0, showMore ? INITIAL_COUNT + MORE_COUNT : INITIAL_COUNT);
  const canShowMore = captions.length > INITIAL_COUNT && !showMore;
  const selectedCaption = value
    ? captions.find((c) => c.personalityId === value)?.caption ?? null
    : null;
  const bizLabel = businessName.trim() || "your business";

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const title = root.querySelector(".va-voice-title");
      const support = root.querySelector(".va-voice-support");
      const cards = root.querySelectorAll(".va-feature");
      const cta = root.querySelector(".va-voice-cta");
      const more = root.querySelector(".va-voice-more");

      if (reducedMotion) {
        gsap.set([title, support, cards, cta, more].filter(Boolean), { autoAlpha: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(title, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5 })
        .fromTo(support, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35 }, "-=0.28")
        .fromTo(
          cards,
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 },
          "-=0.16",
        )
        .fromTo(
          [more, cta].filter(Boolean),
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.04 },
          "-=0.1",
        );
      const failsafe = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 2500);
      return () => window.clearTimeout(failsafe);
    },
    { scope: rootRef, dependencies: [reducedMotion, showMore] },
  );

  useEffect(() => {
    if (!value || reducedMotion) return;
    const quote = rootRef.current?.querySelector(".va-voice-quote");
    if (!quote) return;
    gsap.fromTo(
      quote,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" },
    );
  }, [value, reducedMotion]);

  const onPointerMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const cards = gridRef.current?.querySelectorAll<HTMLElement>(".va-feature");
    if (!cards?.length) return;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--x", String(ev.clientX - rect.left));
      card.style.setProperty("--y", String(ev.clientY - rect.top));
    });
  };

  return (
    <div className="va-voice" ref={rootRef}>
      <div className="va-voice-head">
        <h2 className="va-voice-title">Which sounds more like you?</h2>
        <p className="va-voice-support">
          Real captions for <em>{bizLabel}</em>
          {whatYouDo.trim() ? <> · {whatYouDo.trim()}</> : null}
          {where.trim() ? <> in {where.trim()}</> : null}. Pick one — refine later in Studio.
        </p>
      </div>

      <div
        ref={gridRef}
        className={`va-features${showMore ? " is-more" : " is-four"}`}
        role="listbox"
        aria-label="Voice personality"
        onPointerMove={onPointerMove}
      >
        {visible.map((p) => {
          const selected = value === p.personalityId;
          return (
            <div
              key={p.personalityId}
              className={`va-feature${selected ? " is-selected" : ""}${p.recommended ? " is-rec" : ""}`}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className="va-feature-content"
                onClick={() => onChange(p.personalityId)}
              >
                <div className="va-feature-meta">
                  <strong>{p.label}</strong>
                  {p.recommended ? <span className="va-feature-badge">Best fit</span> : null}
                </div>
                <span className="va-feature-hint">{p.hint}</span>
                <span className="va-feature-caption">“{p.caption}”</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="va-voice-foot">
        {selectedCaption ? (
          <p className="va-voice-quote" key={value}>
            “{selectedCaption}”
          </p>
        ) : null}
        {canShowMore ? (
          <button
            type="button"
            className="va-voice-more"
            onClick={() => setShowMore(true)}
          >
            See 2 more
          </button>
        ) : null}
        <button
          type="button"
          className={`va-voice-cta${value ? " is-ready" : ""}`}
          disabled={!value}
          onClick={onContinue}
        >
          Continue
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M5 2.5L9.5 7L5 11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <style>{`
        .va-voice {
          width: min(920px, 94vw);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 22px;
        }
        .va-voice-head {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .va-voice-title {
          margin: 0;
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 750;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: #141418;
        }
        .va-voice-support {
          margin: 0 auto;
          max-width: 46ch;
          font-size: 13px;
          line-height: 1.45;
          color: rgba(20, 20, 24, 0.48);
          font-weight: 500;
        }
        .va-voice-support em {
          font-style: normal;
          color: rgba(20, 20, 24, 0.72);
          font-weight: 650;
        }
        .va-features {
          width: 100%;
          display: grid;
          gap: 0.5rem;
          align-items: stretch;
        }
        .va-features.is-four {
          grid-template-columns: 1fr 1fr;
        }
        .va-features.is-more {
          grid-template-columns: repeat(3, 1fr);
        }
        .va-feature {
          --x: 80;
          --y: 52;
          --x-px: calc(var(--x) * 1px);
          --y-px: calc(var(--y) * 1px);
          position: relative;
          border-radius: 14px;
          padding: 2px;
          background: rgba(20, 20, 24, 0.08);
          isolation: isolate;
        }
        .va-feature::before,
        .va-feature::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(
            420px circle at var(--x-px) var(--y-px),
            rgba(238, 37, 50, 0.45),
            transparent 42%
          );
        }
        .va-feature::before {
          z-index: 0;
          opacity: 0.55;
        }
        .va-feature::after {
          opacity: 0;
          z-index: 1;
          transition: opacity 0.4s ease;
          background: radial-gradient(
            520px circle at var(--x-px) var(--y-px),
            rgba(238, 37, 50, 0.7),
            transparent 40%
          );
        }
        .va-feature:hover::after,
        .va-feature.is-selected::after {
          opacity: 1;
        }
        .va-feature.is-selected {
          background: rgba(238, 37, 50, 0.35);
        }
        .va-feature.is-rec:not(.is-selected) {
          background: rgba(238, 37, 50, 0.14);
        }
        .va-feature-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: 0.45rem;
          width: 100%;
          min-height: 100%;
          padding: 1rem 1.05rem 1.2rem;
          border: 0;
          border-radius: 12px;
          background: rgba(247, 244, 238, 0.96);
          color: #141418;
          text-align: left;
          cursor: pointer;
          transition: background 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-feature.is-selected .va-feature-content {
          background: #ee2532;
          color: #fff;
        }
        .va-feature-content:focus-visible {
          outline: 2px solid #141418;
          outline-offset: 2px;
        }
        .va-feature.is-selected .va-feature-content:focus-visible {
          outline-color: #fff;
        }
        .va-feature-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .va-feature-meta > strong {
          font-size: 15.5px;
          font-weight: 750;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .va-feature-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #c81e2a;
          background: rgba(238, 37, 50, 0.1);
          border-radius: 999px;
          padding: 3px 7px;
          white-space: nowrap;
          line-height: 1.2;
        }
        .va-feature.is-selected .va-feature-badge {
          color: #fff;
          background: rgba(255, 255, 255, 0.18);
        }
        .va-feature-hint {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.35;
          opacity: 0.45;
        }
        .va-feature.is-selected .va-feature-hint {
          opacity: 0.78;
          color: #fff;
        }
        .va-feature-caption {
          margin: 0;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.45;
          opacity: 0.72;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .va-feature.is-selected .va-feature-caption {
          opacity: 0.95;
          color: #fff;
        }
        .va-voice-foot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .va-voice-quote {
          display: none;
        }
        .va-voice-more {
          border: 0;
          background: transparent;
          color: rgba(20, 20, 24, 0.45);
          font-size: 12.5px;
          font-weight: 650;
          letter-spacing: -0.01em;
          cursor: pointer;
          padding: 4px 8px;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: rgba(20, 20, 24, 0.18);
        }
        .va-voice-more:hover {
          color: rgba(20, 20, 24, 0.72);
        }
        .va-voice-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 168px;
          min-height: 38px;
          padding: 0 28px;
          border: 1px solid rgba(20, 20, 24, 0.12);
          border-radius: 999px;
          background: transparent;
          color: rgba(20, 20, 24, 0.35);
          font-size: 13.5px;
          font-weight: 650;
          letter-spacing: -0.015em;
          cursor: default;
          transition:
            background 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            border-color 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            color 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-voice-cta.is-ready {
          border-color: #ee2532;
          background: #ee2532;
          color: #fff;
          cursor: pointer;
        }
        .va-voice-cta.is-ready:hover { background: #c81e2a; border-color: #c81e2a; }
        .va-voice-cta.is-ready:active { transform: scale(0.98); }
        .va-voice-cta:focus-visible { outline: 2px solid #141418; outline-offset: 3px; }
        .va-voice-cta.is-ready:hover svg {
          transform: translateX(2px);
        }
        .va-voice-cta svg {
          transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
        @media (max-width: 820px) {
          .va-features.is-more {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 560px) {
          .va-features.is-four,
          .va-features.is-more {
            grid-template-columns: 1fr;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .va-feature::before,
          .va-feature::after {
            display: none;
          }
          .va-feature {
            background: rgba(20, 20, 24, 0.06);
            border: 1px solid rgba(20, 20, 24, 0.08);
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
