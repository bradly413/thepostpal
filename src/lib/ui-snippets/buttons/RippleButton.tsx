"use client";

import { useRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";

// Material-style click ripple. Original, license-safe.
// Usage: <RippleButton>Click me</RippleButton>
export default function RippleButton({
  children = "Click me" as ReactNode,
  className = "",
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const d = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "pb-ripple";
      span.style.width = span.style.height = `${d}px`;
      span.style.left = `${e.clientX - rect.left - d / 2}px`;
      span.style.top = `${e.clientY - rect.top - d / 2}px`;
      btn.appendChild(span);
      span.addEventListener("animationend", () => span.remove());
    }
    onClick?.(e);
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-full bg-[#ee2532] px-6 py-2.5 text-sm font-semibold text-white ${className}`}
      {...props}
    >
      {children}
      <style>{`
        .pb-ripple { position: absolute; border-radius: 9999px; background: rgba(255,255,255,0.5); transform: scale(0); animation: pb-ripple 0.6s ease-out; pointer-events: none; }
        @keyframes pb-ripple { to { transform: scale(2.2); opacity: 0; } }
      `}</style>
    </button>
  );
}
