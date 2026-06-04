"use client";

import type { ReactNode } from "react";

// Rounded animated gradient border + soft glow for a social-post frame.
// Combines the "rotating gradient border" idea with a radius-safe conic
// layer (border-image can't round corners) plus an outer brand glow.
// Built for the Studio post preview. Original.
// Usage: <AnimatedPostFrame radius={24} className="w-[320px]"><Post/></AnimatedPostFrame>
export default function AnimatedPostFrame({
  children,
  className = "",
  radius = 24,
  ring = 2,
  duration = 5,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  ring?: number;
  duration?: number;
}) {
  return (
    <div
      className={`pb-pframe relative ${className}`}
      style={{ borderRadius: radius, padding: ring, ["--pb-pf-d" as string]: `${duration}s` }}
    >
      <span className="pb-pframe-spin" aria-hidden />
      <div className="pb-pframe-inner relative z-10 overflow-hidden bg-white" style={{ borderRadius: Math.max(0, radius - ring) }}>
        {children}
      </div>
      <style>{`
        .pb-pframe { position: relative; overflow: hidden; isolation: isolate; box-shadow: 0 0 30px 3px rgba(238,37,50,0.22), 0 18px 50px -20px rgba(0,0,0,0.4); }
        .pb-pframe-spin {
          position: absolute; inset: -75%; z-index: 0;
          background: conic-gradient(from 0deg,
            rgba(238,37,50,0.0) 0deg,
            rgba(238,37,50,0.0) 200deg,
            #ff7a59 280deg,
            #ee2532 330deg,
            rgba(238,37,50,0.0) 360deg);
          animation: pb-pframe-spin var(--pb-pf-d, 5s) linear infinite;
        }
        @keyframes pb-pframe-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .pb-pframe-spin { animation: none; background: conic-gradient(#ee2532, #ff7a59, #ee2532); }
        }
      `}</style>
    </div>
  );
}
