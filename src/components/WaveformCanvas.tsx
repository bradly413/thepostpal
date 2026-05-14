"use client";

import { useEffect, useRef } from "react";

export default function WaveformCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    resize();
    window.addEventListener("resize", resize);

    const lineCount = 24;
    const segments = 80;

    function draw(t: number) {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const hue1 = (t * 0.008) % 360;

      for (let i = 0; i < lineCount; i++) {
        const progress = i / (lineCount - 1);
        const baseY = h * 0.15 + progress * h * 0.7;

        const lineHue = (hue1 + i * 8) % 360;
        const centerFade = 1 - Math.abs(progress - 0.5) * 1.6;
        const alpha = Math.max(0.03, centerFade * 0.35);

        ctx.beginPath();

        for (let s = 0; s <= segments; s++) {
          const sx = (s / segments) * w;
          const nx = s / segments;

          const amp1 = Math.sin(progress * Math.PI) * h * 0.06;
          const amp2 = Math.sin(progress * Math.PI * 1.5) * h * 0.03;
          const amp3 = Math.sin(progress * Math.PI * 0.7) * h * 0.04;

          const wave1 = Math.sin(nx * 4 + t * 0.0015 + i * 0.3) * amp1;
          const wave2 = Math.sin(nx * 7 - t * 0.001 + i * 0.5) * amp2;
          const wave3 = Math.sin(nx * 2.5 + t * 0.0008 + i * 0.15) * amp3;

          const y = baseY + wave1 + wave2 + wave3;

          if (s === 0) ctx.moveTo(sx, y);
          else ctx.lineTo(sx, y);
        }

        ctx.strokeStyle = `hsla(${lineHue}, 65%, 55%, ${alpha})`;
        ctx.lineWidth = (1.2 + centerFade * 1.0) * dpr;
        ctx.stroke();

        if (centerFade > 0.4) {
          ctx.strokeStyle = `hsla(${lineHue}, 80%, 65%, ${alpha * 0.3})`;
          ctx.lineWidth = (3 + centerFade * 4) * dpr;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
