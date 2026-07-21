"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

/**
 * Auto-scrolling proof strip under the hero.
 *
 * DATA HONESTY: Posterboy has no published, verified product metrics yet.
 * Every figure below is explicitly illustrative — flagged in data
 * (isPlaceholder/verified) and labeled visibly in the UI. Replace with real,
 * sourced numbers when they exist; do not remove the label before then.
 */

interface ProofStat {
  value: string;
  label: string;
  isPlaceholder: true;
  source: "placeholder";
  verified: false;
}

const STATS: ProofStat[] = [
  {
    value: "3 posts",
    label: "drafted from one rough note",
    isPlaceholder: true,
    source: "placeholder",
    verified: false,
  },
  {
    value: "Hours back",
    label: "no more Sunday-night Canva",
    isPlaceholder: true,
    source: "placeholder",
    verified: false,
  },
  {
    value: "A week ahead",
    label: "the calendar fills before Monday",
    isPlaceholder: true,
    source: "placeholder",
    verified: false,
  },
  {
    value: "One voice",
    label: "across every caption and location",
    isPlaceholder: true,
    source: "placeholder",
    verified: false,
  },
];

const CHIPS = [
  "Corner café",
  "Neighborhood restaurant",
  "Local real estate",
  "Salon & med spa",
  "Boutique retail",
  "HVAC & trades",
] as const;

export default function ProofStrip() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready || reducedMotion) return;
      const track = trackRef.current;
      if (!track) return;
      // Two identical sets; sliding -50% then wrapping is seamless.
      tween.current = gsap.to(track, {
        xPercent: -50,
        duration: 34,
        ease: "none",
        repeat: -1,
      });
      return () => {
        tween.current?.kill();
        tween.current = null;
      };
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  // Pause on hover and while keyboard focus is inside.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pause = () => tween.current?.pause();
    const play = () => tween.current?.play();
    root.addEventListener("pointerenter", pause);
    root.addEventListener("pointerleave", play);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", play);
    return () => {
      root.removeEventListener("pointerenter", pause);
      root.removeEventListener("pointerleave", play);
      root.removeEventListener("focusin", pause);
      root.removeEventListener("focusout", play);
    };
  }, []);

  const renderSet = (hidden: boolean) => (
    <div className="pbx-proof-set" aria-hidden={hidden || undefined}>
      {STATS.map((stat) => (
        <div className="pbx-proof-stat" key={`${hidden}-${stat.value}`}>
          <span className="pbx-proof-value">{stat.value}</span>
          <span className="pbx-proof-label">{stat.label}</span>
        </div>
      ))}
      {CHIPS.map((chip) => (
        <span className="pbx-proof-chip" key={`${hidden}-${chip}`}>
          {chip}
        </span>
      ))}
    </div>
  );

  return (
    <section className="pbx-proofstrip" aria-labelledby="pbx-proofstrip-title" ref={rootRef}>
      <h2 id="pbx-proofstrip-title" className="pbx-proofstrip-srtitle">
        What a Posterboy week gives back
      </h2>
      <p className="pbx-proofstrip-note">
        Illustrative product metrics — example outcomes, not verified customer data.
      </p>
      {reducedMotion ? (
        <div className="pbx-proof-static">{renderSet(false)}</div>
      ) : (
        <div className="pbx-proof-marquee">
          <div className="pbx-proof-track" ref={trackRef}>
            {renderSet(false)}
            {renderSet(true)}
          </div>
        </div>
      )}

      <style>{`
        .pbx-proofstrip {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(18px, 3vh, 30px) 0;
          border-top: 1px solid rgba(20,20,24,0.08);
          border-bottom: 1px solid rgba(20,20,24,0.08);
          background: rgba(255,255,255,0.45);
          overflow: hidden;
        }
        .pbx-proofstrip-srtitle {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        .pbx-proofstrip-note {
          margin: 0 auto 14px;
          padding: 0 clamp(20px, 3vw, 48px);
          max-width: 1280px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
        }
        .pbx-proof-marquee { overflow: hidden; }
        .pbx-proof-track { display: flex; width: max-content; will-change: transform; }
        .pbx-proof-set { display: flex; align-items: center; gap: clamp(22px, 3vw, 44px); padding-right: clamp(22px, 3vw, 44px); }
        .pbx-proof-stat { display: flex; align-items: baseline; gap: 9px; white-space: nowrap; }
        .pbx-proof-value {
          font-size: clamp(17px, 1.5vw, 21px);
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--ink);
        }
        .pbx-proof-label { font-size: 13.5px; color: color-mix(in srgb, var(--ink) 55%, transparent); white-space: nowrap; }
        .pbx-proof-chip {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
          border: 1px solid rgba(20,20,24,0.14);
          border-radius: 999px;
          padding: 6px 13px;
          white-space: nowrap;
        }
        .pbx-proof-static .pbx-proof-set { flex-wrap: wrap; padding: 0 clamp(20px, 3vw, 48px); max-width: 1280px; margin: 0 auto; }
      `}</style>
    </section>
  );
}
