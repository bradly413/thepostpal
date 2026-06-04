"use client";

import type { CSSProperties, ReactNode } from "react";

// Continuously animated gradient border using registered @property custom
// props (conic rotation or radial sweep). Adapted from a user-provided
// CodePen snippet; recolored to brand red.
// Usage: <RotatingGradientBorder variant="conic" className="rounded-2xl p-6">…</RotatingGradientBorder>
export default function RotatingGradientBorder({
  children,
  className = "",
  variant = "conic",
  duration = 3,
  color = "#ee2532",
}: {
  children: ReactNode;
  className?: string;
  variant?: "conic" | "radial";
  duration?: number;
  color?: string;
}) {
  const style = {
    ["--pb-c1" as string]: color,
    ["--pb-d" as string]: `${duration}s`,
  } as CSSProperties;

  return (
    <div className={`pb-rgb pb-rgb-${variant} ${className}`} style={style}>
      {children}
      <style>{`
        @property --pb-angle { syntax: '<angle>'; initial-value: 90deg; inherits: false; }
        @property --pb-gx { syntax: '<percentage>'; initial-value: 50%; inherits: false; }
        @property --pb-gy { syntax: '<percentage>'; initial-value: 0%; inherits: false; }
        .pb-rgb {
          --pb-c2: color-mix(in srgb, var(--pb-c1) 8%, transparent);
          border: 0.3rem solid;
        }
        .pb-rgb-conic {
          border-image: conic-gradient(from var(--pb-angle), var(--pb-c2), var(--pb-c1) 0.1turn, var(--pb-c1) 0.15turn, var(--pb-c2) 0.25turn) 30;
          animation: pb-rgb-rotate var(--pb-d) linear infinite;
        }
        .pb-rgb-radial {
          border-image: radial-gradient(ellipse at var(--pb-gx) var(--pb-gy), var(--pb-c1), var(--pb-c1) 10%, var(--pb-c2) 40%) 30;
          animation: pb-rgb-radial var(--pb-d) linear infinite;
        }
        @keyframes pb-rgb-rotate { 100% { --pb-angle: 450deg; } }
        @keyframes pb-rgb-radial {
          20%  { --pb-gx: 100%; --pb-gy: 50%; }
          40%  { --pb-gx: 100%; --pb-gy: 100%; }
          60%  { --pb-gx: 50%;  --pb-gy: 100%; }
          80%  { --pb-gx: 0%;   --pb-gy: 50%; }
          100% { --pb-gx: 50%;  --pb-gy: 0%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pb-rgb-conic, .pb-rgb-radial { animation: none; }
        }
      `}</style>
    </div>
  );
}
