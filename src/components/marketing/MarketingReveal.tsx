"use client";

import { useEffect } from "react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { setupRevealBatch } from "@/lib/marketing-motion";

// Mounts the site-wide [data-reveal] scroll batch once the page + Lenis are
// ready. Renders nothing; just wires the shared reveal system to the DOM.
export default function MarketingReveal() {
  const { ready, reducedMotion } = useMarketingScroll();

  useEffect(() => {
    if (!ready) return;
    let cleanup: (() => void) | undefined;
    // Defer a frame so freshly-mounted sections are in the DOM before we query.
    const raf = requestAnimationFrame(() => {
      cleanup = setupRevealBatch(reducedMotion);
    });
    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [ready, reducedMotion]);

  return null;
}
