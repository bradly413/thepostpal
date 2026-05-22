"use client";

import { CHAPTER_GRADIENTS } from "@/lib/experience/gradients";

interface GradientLayerProps {
  progress: number;
}

export default function GradientLayer({ progress }: GradientLayerProps) {
  const active = Math.floor(progress * CHAPTER_GRADIENTS.length) % CHAPTER_GRADIENTS.length;

  return (
    <div className="pb-xp-gradients" aria-hidden="true">
      {CHAPTER_GRADIENTS.map((g, i) => {
        const dist = Math.abs(i - active);
        const opacity = i === active ? 0.85 : Math.max(0, 0.4 - dist * 0.15);
        return (
          <div
            key={g.id}
            className="pb-xp-gradient"
            style={{
              background: g.stops,
              opacity,
              transform: `scale(${1 + progress * 0.05}) translateY(${(i - active) * 2}%)`,
            }}
          />
        );
      })}
    </div>
  );
}
