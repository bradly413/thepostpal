"use client";

import { useEffect, useRef, useCallback } from "react";

interface Dot {
  x: number;
  y: number;
  h: number;
  w: number;
  c: number;
  m: number;
}

export default function AuroraCanvas({ hue = 230 }: { hue?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);

  const buildDots = useCallback((w: number, h: number, baseHue: number) => {
    const count = 60;
    const maxH = h * 0.9;
    const minH = h * 0.4;
    const maxW = 12;
    const minW = 2;
    const maxSpeed = 30;
    const minSpeed = 4;
    const hueDif = 50;
    const dots: Dot[] = [];
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.4,
        h: Math.random() * (maxH - minH) + minH,
        w: Math.random() * (maxW - minW) + minW,
        c: Math.random() * (hueDif * 2) + (baseHue - hueDif),
        m: Math.random() * (maxSpeed - minSpeed) + minSpeed,
      });
    }
    return dots;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      dotsRef.current = buildDots(rect.width, rect.height, hue);
      ctx.globalCompositeOperation = "lighter";
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const render = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      for (const dot of dotsRef.current) {
        ctx.beginPath();
        const grd = ctx.createLinearGradient(dot.x, dot.y, dot.x + dot.w, dot.y + dot.h);
        grd.addColorStop(0.0, `hsla(${dot.c},50%,50%,0)`);
        grd.addColorStop(0.2, `hsla(${dot.c + 20},50%,50%,0.4)`);
        grd.addColorStop(0.5, `hsla(${dot.c + 50},70%,60%,0.6)`);
        grd.addColorStop(0.8, `hsla(${dot.c + 80},50%,50%,0.4)`);
        grd.addColorStop(1.0, `hsla(${dot.c + 100},50%,50%,0)`);
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${dot.c},50%,50%,0.8)`;
        ctx.fillStyle = grd;
        ctx.fillRect(dot.x, dot.y, dot.w, dot.h);
        ctx.closePath();
        dot.x += dot.m / 100;
        if (dot.x > w + 15) {
          dot.x = -15;
        }
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [hue, buildDots]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, hsla(${hue},50%,50%,0.1) 0%, rgba(0,0,0,0) 60%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.9) 100%)",
        }}
      />
    </div>
  );
}
