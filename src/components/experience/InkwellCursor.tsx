"use client";

import { useEffect, useRef } from "react";

interface InkwellCursorProps {
  label?: string;
}

export default function InkwellCursor({ label }: InkwellCursorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const wrap = wrapRef.current;
    if (!wrap) return;

    function onMove(e: MouseEvent) {
      target.current = { x: e.clientX, y: e.clientY };
      if (!moved.current) {
        moved.current = true;
        wrap?.classList.add("pb-xp-cursor--moved");
      }
    }

    let raf = 0;
    function tick() {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      if (wrap) {
        wrap.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pb-xp-cursor" aria-hidden="true">
      <div className="pb-xp-cursor-glass">
        <div className="pb-xp-cursor-glass-bg" />
        <div className="pb-xp-cursor-glass-bg-dark" />
        {label && <span className="pb-xp-cursor-text">{label}</span>}
      </div>
      <div className="pb-xp-cursor-dot" />
    </div>
  );
}
