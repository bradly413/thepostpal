"use client";

import type { ReactNode } from "react";

// Border that draws itself in on hover (top -> right -> bottom -> left).
// Adapted from a user-provided CodePen CSS snippet; recolored to brand red.
// Usage: <BorderDrawBox className="p-8 max-w-sm">…</BorderDrawBox>
export default function BorderDrawBox({
  children,
  className = "",
  color = "#ee2532",
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div className={`pb-bdraw ${className}`} style={{ ["--pb-bd" as string]: color }}>
      {children}
      <style>{`
        .pb-bdraw {
          background-repeat: no-repeat;
          background-image:
            linear-gradient(to right, var(--pb-bd) 100%, var(--pb-bd) 100%),
            linear-gradient(to bottom, var(--pb-bd) 100%, var(--pb-bd) 100%),
            linear-gradient(to right, var(--pb-bd) 100%, var(--pb-bd) 100%),
            linear-gradient(to bottom, var(--pb-bd) 100%, var(--pb-bd) 100%);
          background-size: 100% 3px, 3px 100%, 100% 3px, 3px 100%;
          background-position: 0 0, 100% 0, 100% 100%, 0 100%;
          animation: pb-bdraw 1.25s cubic-bezier(0.19, 1, 0.22, 1) 1;
          animation-play-state: paused;
        }
        .pb-bdraw:hover { animation-play-state: running; }
        @keyframes pb-bdraw {
          0%   { background-size: 0 3px,    3px 0,    0 3px,    3px 0; }
          25%  { background-size: 100% 3px, 3px 0,    0 3px,    3px 0; }
          50%  { background-size: 100% 3px, 3px 100%, 0 3px,    3px 0; }
          75%  { background-size: 100% 3px, 3px 100%, 100% 3px, 3px 0; }
          100% { background-size: 100% 3px, 3px 100%, 100% 3px, 3px 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pb-bdraw { animation: none; background-size: 100% 3px, 3px 100%, 100% 3px, 3px 100%; }
        }
      `}</style>
    </div>
  );
}
