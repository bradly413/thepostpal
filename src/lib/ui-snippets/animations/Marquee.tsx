"use client";

import type { ReactNode } from "react";

// Infinite horizontal marquee that pauses on hover. Original, license-safe.
// Usage: <Marquee speed={25}><Logo/><Logo/>…</Marquee>  (children are duplicated)
export default function Marquee({
  children,
  speed = 25,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <div className={`pb-marquee group relative flex overflow-hidden ${className}`}>
      <div className="pb-marquee-track flex shrink-0 items-center gap-8 pr-8" style={{ animationDuration: `${speed}s` }}>
        {children}
      </div>
      <div className="pb-marquee-track flex shrink-0 items-center gap-8 pr-8" aria-hidden style={{ animationDuration: `${speed}s` }}>
        {children}
      </div>
      <style>{`
        .pb-marquee-track { animation: pb-marquee linear infinite; }
        .pb-marquee:hover .pb-marquee-track { animation-play-state: paused; }
        @keyframes pb-marquee { to { transform: translateX(-100%); } }
        @media (prefers-reduced-motion: reduce) { .pb-marquee-track { animation: none; } }
      `}</style>
    </div>
  );
}
