"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Animated rotating gradient border ("border beam"). Original, license-safe.
// Usage: <AnimatedBorderButton>Get started</AnimatedBorderButton>
export default function AnimatedBorderButton({
  children = "Get started" as ReactNode,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full p-[2px] ${className}`}
      {...props}
    >
      <span className="pb-abb-glow absolute inset-[-150%]" aria-hidden />
      <span className="relative z-10 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black">
        {children}
      </span>
      <style>{`
        .pb-abb-glow { background: conic-gradient(from 0deg, transparent 0 70%, #ee2532 100%); animation: pb-abb-spin 2.6s linear infinite; }
        @keyframes pb-abb-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .pb-abb-glow { animation: none; } }
      `}</style>
    </button>
  );
}
