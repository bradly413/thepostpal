"use client";

import { useEffect, useRef } from "react";

/**
 * ParticleImageAssemble — an image materializes from a swarm of particles.
 *
 * Technique from the classic ParticleSlider effect (Tamino Martinius),
 * re-implemented from scratch: sample the image's pixels on a grid, scatter
 * particles randomly, then spring each one to its home pixel
 * (v = (v + (target - pos) * spring) * friction). Particles carry the
 * sampled pixel color, so the image assembles in its own palette. When the
 * swarm converges, the canvas crossfades into the real image.
 *
 * Plays ONCE per mount. prefers-reduced-motion (or image load failure)
 * skips straight to the image. Self-contained 2D canvas — no deps.
 *
 * Usage: drop in place of an absolutely-positioned image layer:
 *   <ParticleImageAssemble src="/hero/fathers-day.jpg" className="cf-img" />
 */

const SPRING = 0.06;
const FRICTION = 0.85;
const MAX_PARTICLES = 9000;

export default function ParticleImageAssemble({
  src,
  className,
  gap = 4,
  duration = 1800,
  delay = 0,
}: {
  src: string;
  className?: string;
  /** sample every `gap` pixels — larger = fewer, chunkier particles */
  gap?: number;
  /** ms before the crossfade to the real image begins */
  duration?: number;
  delay?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const imgLayer = imgLayerRef.current;
    if (!canvas || !imgLayer) return;

    const reveal = () => {
      imgLayer.style.opacity = "1";
      canvas.style.opacity = "0";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }

    let raf = 0;
    let cancelled = false;
    const img = new Image();
    img.src = src;
    img.onerror = reveal;
    img.onload = () => {
      if (cancelled) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!w || !h) { reveal(); return; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reveal(); return; }

      // draw the image cover-cropped, then sample its pixels
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        reveal(); // tainted canvas (cross-origin image) — skip gracefully
        return;
      }
      ctx.clearRect(0, 0, w, h);

      // adaptive gap so heavy images stay under the particle budget
      let step = gap;
      while ((w / step) * (h / step) > MAX_PARTICLES) step++;

      const pts: { x: number; y: number; vx: number; vy: number; tx: number; ty: number; c: string }[] = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (data[i + 3] < 120) continue;
          pts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.5) * 14,
            tx: x,
            ty: y,
            c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
          });
        }
      }

      const size = Math.max(1.5, step - 1.5);
      const start = performance.now() + delay;
      let faded = false;

      const tick = (now: number) => {
        if (cancelled) return;
        if (now < start) { raf = requestAnimationFrame(tick); return; }
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
          p.vx = (p.vx + (p.tx - p.x) * SPRING) * FRICTION;
          p.vy = (p.vy + (p.ty - p.y) * SPRING) * FRICTION;
          p.x += p.vx;
          p.y += p.vy;
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x, p.y, size, size);
        }
        const elapsed = now - start;
        if (elapsed > duration && !faded) {
          faded = true;
          reveal(); // CSS transitions handle the crossfade
        }
        if (elapsed < duration + 700) {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [src, gap, duration, delay]);

  return (
    <div className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        ref={imgLayerRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${src}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0,
          transition: "opacity 600ms ease",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 1,
          transition: "opacity 700ms ease",
        }}
      />
    </div>
  );
}
