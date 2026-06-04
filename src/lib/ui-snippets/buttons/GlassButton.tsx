"use client";

import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";

// Glassmorphism button — a frosted glass pill with a diagonal shine-sweep on
// hover and twin neon edge-bars (top + bottom) that bloom and expand into glowing
// borders. Adapted from a user-shared CodePen (technique reused, authored fresh).
//
// Reads best on a dark or vibrant backdrop (the glass + neon need contrast).
// `accent` sets the neon color and defaults to brand red #ee2532.
// Usage: <GlassButton accent="#ee2532" href="#">Read more</GlassButton>
export default function GlassButton({
  children = "Read more" as ReactNode,
  accent = "#ee2532",
  className = "",
  href = "#",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { accent?: string }) {
  return (
    <span className="gbtn" style={{ "--gbtn-accent": accent } as CSSProperties}>
      <a href={href} className={className} {...props}>
        {children}
      </a>
      <style>{`
        .gbtn {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          width: 250px; height: 50px; max-width: 100%;
        }
        .gbtn a {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100%; padding: 10px;
          color: #fff; font-weight: 400; letter-spacing: 1px;
          text-decoration: none; overflow: hidden;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 15px 15px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          transition: letter-spacing 0.5s;
        }
        .gbtn:hover a { letter-spacing: 3px; }
        /* diagonal shine sweep */
        .gbtn a::before {
          content: ""; position: absolute; top: 0; left: 0;
          width: 50%; height: 100%;
          background: linear-gradient(to left, rgba(255, 255, 255, 0.15), transparent);
          transform: skewX(45deg) translateX(0);
          transition: transform 0.5s;
        }
        .gbtn:hover a::before { transform: skewX(45deg) translateX(200px); }
        /* twin neon edge-bars (top + bottom) */
        .gbtn::before, .gbtn::after {
          content: ""; position: absolute; left: 50%; transform: translateX(-50%);
          width: 30px; height: 10px; border-radius: 10px;
          background: var(--gbtn-accent);
          box-shadow:
            0 0 5px var(--gbtn-accent), 0 0 15px var(--gbtn-accent),
            0 0 30px var(--gbtn-accent), 0 0 60px var(--gbtn-accent);
          transition: 0.5s; transition-delay: 0.25s;
        }
        .gbtn::before { bottom: -5px; }
        .gbtn::after { top: -5px; }
        .gbtn:hover::before { bottom: 0; height: 50%; width: 80%; border-radius: 30px; }
        .gbtn:hover::after  { top: 0;    height: 50%; width: 80%; border-radius: 30px; }
        @media (prefers-reduced-motion: reduce) {
          .gbtn a, .gbtn a::before, .gbtn::before, .gbtn::after { transition: none; }
        }
      `}</style>
    </span>
  );
}
