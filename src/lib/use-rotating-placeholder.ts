"use client";

import { useEffect, useState } from "react";

export function useRotatingPlaceholder(
  placeholders: readonly string[],
  active: boolean,
  intervalMs = 4200,
  fadeMs = 280,
): { placeholder: string; fading: boolean } {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!active || placeholders.length <= 1) return;
    const id = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % placeholders.length);
        setFading(false);
      }, fadeMs);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, placeholders.length, intervalMs, fadeMs]);

  const placeholder = placeholders[idx] ?? placeholders[0] ?? "";
  return { placeholder, fading };
}
