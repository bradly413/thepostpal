"use client";

interface ScrollBarProps {
  progress: number;
}

export default function ScrollBar({ progress }: ScrollBarProps) {
  return (
    <div className="pb-xp-scrollbar-wrap" aria-hidden="true">
      <div className="pb-xp-scrollbar-track">
        <div className="pb-xp-scrollbar-fill" style={{ transform: `scaleY(${progress})` }} />
      </div>
    </div>
  );
}
