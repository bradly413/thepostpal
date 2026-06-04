"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Static gradient border that intensifies on hover. Original, license-safe.
// Usage: <GradientBorderButton>Learn more</GradientBorderButton>
export default function GradientBorderButton({
  children = "Learn more" as ReactNode,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`group relative rounded-full p-[1.5px] ${className}`} {...props}>
      <span
        className="absolute inset-0 rounded-full opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundImage: "linear-gradient(120deg, #ee2532, #ff7a59, #ee2532)" }}
        aria-hidden
      />
      <span className="relative block rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-colors group-hover:bg-[#fff7f7]">
        {children}
      </span>
    </button>
  );
}
