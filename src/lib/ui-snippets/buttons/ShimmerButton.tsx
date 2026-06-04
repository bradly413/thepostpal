"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Sweeping shine button. Original, license-safe.
// Usage: <ShimmerButton>Continue</ShimmerButton>
export default function ShimmerButton({
  children = "Continue" as ReactNode,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`relative overflow-hidden rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="pb-shimmer-sweep pointer-events-none absolute inset-0" aria-hidden />
      <style>{`
        .pb-shimmer-sweep { background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%); transform: translateX(-100%); animation: pb-shimmer 2.2s ease-in-out infinite; }
        @keyframes pb-shimmer { to { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) { .pb-shimmer-sweep { animation: none; opacity: 0; } }
      `}</style>
    </button>
  );
}
