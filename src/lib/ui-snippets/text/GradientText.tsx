"use client";

import type { ReactNode } from "react";

// Animated flowing gradient text. Original, license-safe.
// Usage: <GradientText className="text-4xl font-bold">Posterboy</GradientText>
export default function GradientText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <span className={`pb-gtext bg-clip-text text-transparent ${className}`}>{children}</span>
      <style>{`
        .pb-gtext { background-image: linear-gradient(90deg, #ee2532, #ff7a59, #ee2532); background-size: 200% auto; animation: pb-gtext 4s linear infinite; }
        @keyframes pb-gtext { to { background-position: 200% center; } }
        @media (prefers-reduced-motion: reduce) { .pb-gtext { animation: none; } }
      `}</style>
    </>
  );
}
