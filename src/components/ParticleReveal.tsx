"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

/* ─── types ─── */
interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  r: number;
  g: number;
  b: number;
  targetR: number;
  targetG: number;
  targetB: number;
  size: number;
  targetSize: number;
  alpha: number;
  vx: number;
  vy: number;
  phase: number;
}

interface ParticleRevealProps {
  active: boolean;
  imageUrl: string | null;
  onComplete: () => void;
}

/* ─── palette — warm golds/ambers matching Posterboy accent ─── */
const PALETTE = [
  [212, 168, 83],  // accent gold
  [255, 223, 150], // light gold
  [180, 140, 60],  // deep amber
  [255, 245, 220], // cream
  [240, 200, 120], // warm yellow
  [160, 130, 80],  // bronze
  [255, 255, 255], // white spark
  [200, 180, 140], // taupe
];

const PARTICLE_COUNT = 2000;
const SAMPLE_SIZE = 50;

export default function ParticleReveal({
  active,
  imageUrl,
  onComplete,
}: ParticleRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<"idle" | "swirl" | "coalesce" | "reveal">("idle");
  const timeRef = useRef(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  // Store logical (CSS) dimensions so draw() doesn't need to derive them
  const dimsRef = useRef({ w: 0, h: 0 });
  const canvasAlphaRef = useRef({ value: 1 });

  /* ─── create particles in logical coordinates ─── */
  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];
    const cx = w / 2;
    const cy = h / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.min(w, h) * 0.45;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        targetX: 0,
        targetY: 0,
        r: color[0],
        g: color[1],
        b: color[2],
        targetR: 0,
        targetG: 0,
        targetB: 0,
        size: 1.2 + Math.random() * 2.2,
        targetSize: 0,
        alpha: 0,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return particles;
  }, []);

  /* ─── sample image pixels ─── */
  const sampleImage = useCallback(
    (url: string): Promise<ImageData> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const off = document.createElement("canvas");
          off.width = SAMPLE_SIZE;
          off.height = SAMPLE_SIZE;
          const ctx = off.getContext("2d");
          if (!ctx) return reject(new Error("No ctx"));
          ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          resolve(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE));
        };
        img.onerror = reject;
        img.src = url;
      });
    },
    []
  );

  /* ─── render loop — all coordinates in logical (CSS) pixels ─── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimsRef.current;
    if (w === 0 || h === 0) return;

    const particles = particlesRef.current;
    const phase = phaseRef.current;
    const t = timeRef.current;
    const cx = w / 2;
    const cy = h / 2;

    // Clear in logical coords (ctx already has DPR scale)
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = canvasAlphaRef.current.value;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (phase === "swirl") {
        // Gentle fade-in over ~60 frames
        if (t < 60) {
          p.alpha = Math.min(
            0.7,
            (t / 60) * (0.4 + 0.3 * Math.sin(p.phase))
          );
        } else {
          // Pulsing alpha
          p.alpha = 0.35 + 0.35 * Math.sin(t * 0.003 + p.phase);
        }

        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;

        // Vortex pull — gentle, keeps particles in view
        const pull = Math.min(0.001 * dist, 0.5);
        p.vx += dx * pull * 0.01;
        p.vy += dy * pull * 0.01;

        // Tangential swirl
        p.vx += (-dy / dist) * 0.12;
        p.vy += (dx / dist) * 0.12;

        // Organic drift using sin waves
        p.vx += Math.sin(t * 0.002 + p.phase) * 0.06;
        p.vy += Math.cos(t * 0.0018 + p.phase * 1.3) * 0.06;

        // Damping
        p.vx *= 0.965;
        p.vy *= 0.965;

        p.x += p.vx;
        p.y += p.vy;

        // Soft boundary
        if (p.x < 0) p.vx += 0.4;
        if (p.x > w) p.vx -= 0.4;
        if (p.y < 0) p.vy += 0.4;
        if (p.y > h) p.vy -= 0.4;
      }

      // Draw particle
      if (p.alpha <= 0) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${p.alpha})`;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    timeRef.current++;
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  /* ─── start swirl phase ─── */
  const startSwirl = useCallback(
    (w: number, h: number) => {
      dimsRef.current = { w, h };
      const particles = initParticles(w, h);
      particlesRef.current = particles;
      phaseRef.current = "swirl";
      timeRef.current = 0;
      canvasAlphaRef.current.value = 1;

      // Start render loop
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    },
    [initParticles, draw]
  );

  /* ─── coalesce phase ─── */
  const startCoalesce = useCallback(
    async (url: string) => {
      if (
        phaseRef.current === "coalesce" ||
        phaseRef.current === "reveal"
      )
        return;

      const { w, h } = dimsRef.current;

      try {
        const imageData = await sampleImage(url);
        const pixels = imageData.data;
        const particles = particlesRef.current;
        phaseRef.current = "coalesce";

        const cellW = w / SAMPLE_SIZE;
        const cellH = h / SAMPLE_SIZE;

        // Assign each particle a target from the pixel grid
        for (let i = 0; i < particles.length; i++) {
          const gridIdx = i % (SAMPLE_SIZE * SAMPLE_SIZE);
          const gridX = gridIdx % SAMPLE_SIZE;
          const gridY = Math.floor(gridIdx / SAMPLE_SIZE);
          const px = gridIdx * 4;

          const p = particles[i];
          p.targetX = gridX * cellW + cellW / 2;
          p.targetY = gridY * cellH + cellH / 2;
          p.targetR = pixels[px];
          p.targetG = pixels[px + 1];
          p.targetB = pixels[px + 2];
          p.targetSize = cellW * 0.62;
          // Stop velocity — GSAP takes over
          p.vx = 0;
          p.vy = 0;
        }

        // Animate particles to their image-pixel targets
        tlRef.current = gsap.timeline({
          onComplete: () => {
            // Reveal: fade canvas out
            phaseRef.current = "reveal";
            gsap.to(canvasAlphaRef.current, {
              value: 0,
              duration: 0.5,
              ease: "power2.inOut",
              onComplete: () => {
                cancelAnimationFrame(rafRef.current);
                phaseRef.current = "idle";
                onComplete();
              },
            });
          },
        });

        tlRef.current.to(particles, {
          x: (i: number) => particles[i].targetX,
          y: (i: number) => particles[i].targetY,
          r: (i: number) => particles[i].targetR,
          g: (i: number) => particles[i].targetG,
          b: (i: number) => particles[i].targetB,
          size: (i: number) => particles[i].targetSize,
          alpha: 1,
          duration: 1.8,
          stagger: { amount: 0.5, from: "random" },
          ease: "power3.inOut",
        });
      } catch {
        // Fallback — just complete
        phaseRef.current = "reveal";
        gsap.to(canvasAlphaRef.current, {
          value: 0,
          duration: 0.3,
          onComplete: () => {
            cancelAnimationFrame(rafRef.current);
            phaseRef.current = "idle";
            onComplete();
          },
        });
      }
    },
    [sampleImage, onComplete]
  );

  /* ─── lifecycle: active → swirl ─── */
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Set physical canvas size
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    // Set CSS display size
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    // Scale context so all drawing is in logical pixels
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    startSwirl(w, h);

    return () => {
      cancelAnimationFrame(rafRef.current);
      tlRef.current?.kill();
      phaseRef.current = "idle";
    };
  }, [active, startSwirl]);

  /* ─── lifecycle: imageUrl → coalesce ─── */
  useEffect(() => {
    if (!imageUrl || !active) return;
    startCoalesce(imageUrl);
  }, [imageUrl, active, startCoalesce]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ borderRadius: "inherit" }}
    />
  );
}
