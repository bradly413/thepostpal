"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Soft accent glow that blooms behind the button on hover. Original.
// Usage: <HoverGlowButton>Hover me</HoverGlowButton>
export default function HoverGlowButton({
  children = "Hover me" as ReactNode,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`group relative rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 ${className}`}
      {...props}
    >
      <span
        className="absolute -inset-1 -z-10 rounded-full bg-[#ee2532] opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-70"
        aria-hidden
      />
      {children}
    </button>
  );
}
