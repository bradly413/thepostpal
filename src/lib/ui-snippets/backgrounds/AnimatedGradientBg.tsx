"use client";

import type { ReactNode } from "react";

// Slowly shifting multi-stop gradient background. Original, license-safe.
// Usage: <AnimatedGradientBg className="rounded-3xl p-10">…</AnimatedGradientBg>
export default function AnimatedGradientBg({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`pb-agbg relative ${className}`}>
      {children}
      <style>{`
        .pb-agbg { background: linear-gradient(-45deg, #ee2532, #ff7a59, #c81e2a, #ff9472); background-size: 400% 400%; animation: pb-agbg 14s ease infinite; }
        @keyframes pb-agbg { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @media (prefers-reduced-motion: reduce) { .pb-agbg { animation: none; } }
      `}</style>
    </div>
  );
}
