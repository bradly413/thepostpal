"use client";

import { usePathname } from "next/navigation";

/**
 * Fades dashboard page content in on navigation.
 *
 * Uses a pure CSS keyframe (keyed by pathname so it replays per route) instead
 * of rAF-gated React state. Critical property: the element's RESTING opacity is
 * 1 — content reveal is never gated on a requestAnimationFrame callback firing.
 * The previous implementation stranded the whole page at opacity:0 whenever the
 * rAF didn't fire (backgrounded/hidden tab, interrupted render), which read as a
 * blank "rendering glitch" on Reports/Issues. Respects prefers-reduced-motion
 * via the .pb-page-fade rule in globals.css.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="flex-1 flex flex-col min-h-0 pb-page-fade">
      {children}
    </div>
  );
}
