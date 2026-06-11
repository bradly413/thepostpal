"use client";

/** THROWAWAY DEMO — /reveal-concept. Drives StudioParticleReveal with sample
 *  images so we can see the full-screen particle storm → image morph. */

import { useRef, useState } from "react";
import StudioParticleReveal from "@/components/dashboard/studio/StudioParticleReveal";

const SAMPLES = ["/brand/interior-arch.jpg", "/brand/cover.jpg", "/brand/ad-fireplace.jpg", "/brand/IMG_8730.jpg"];

export default function RevealConcept() {
  const [active, setActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const idx = useRef(0);
  const timer = useRef<number | null>(null);

  const generate = () => {
    const src = SAMPLES[idx.current % SAMPLES.length];
    idx.current++;
    setResult(null);
    setImageUrl(null);
    setActive(true);
    // simulate generation latency, then the image "arrives"
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setImageUrl(src), 2200);
  };

  return (
    <div className="rc">
      <div className="rc-frame">
        {result ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result} alt="result" />
        ) : (
          <span className="rc-empty">Your post will appear here</span>
        )}
      </div>
      <button className="rc-btn" onClick={generate} disabled={active}>
        {active ? "Generating…" : "Generate"}
      </button>

      <StudioParticleReveal
        active={active}
        imageUrl={imageUrl}
        onComplete={() => {
          setResult(SAMPLES[(idx.current - 1) % SAMPLES.length]);
          setActive(false);
          setImageUrl(null);
        }}
      />

      <style>{`
        .rc { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px;
          background: linear-gradient(168deg, #eef0f2, #e9ebee, #edeff1); font-family: ui-sans-serif, system-ui, sans-serif; }
        .rc-frame { width: 360px; height: 450px; border-radius: 22px; overflow: hidden; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.72); backdrop-filter: blur(22px) saturate(1.5); border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 40px 90px -50px rgba(40,30,15,0.5); }
        .rc-frame img { width: 100%; height: 100%; object-fit: cover; }
        .rc-empty { font-size: 14px; color: #9a9183; }
        .rc-btn { appearance: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 15px; padding: 13px 34px; border-radius: 99px;
          background: #ee2532; border: 1px solid #ee2532; color: #fff; box-shadow: 0 14px 30px -14px rgba(238,37,50,0.7); }
        .rc-btn:disabled { opacity: 0.5; cursor: default; }
      `}</style>
    </div>
  );
}
