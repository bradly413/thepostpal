"use client";

import { useRef, useEffect, type RefObject } from "react";
import { Canvas, useFrame, extend, type ThreeElements } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
import { Fraunces, Syne, Newsreader } from "next/font/google";

gsap.registerPlugin(Observer);

// Typographic-voice specimens for the aesthetics step.
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });
const syne = Syne({ subsets: ["latin"], weight: ["500", "700"] });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["300", "400"], style: ["normal", "italic"] });

const TYPE_VOICES = [
  { name: "Editorial", desc: "Warm, literary, high-contrast", className: fraunces.className, italic: true, weight: 400 },
  { name: "Modernist", desc: "Geometric, confident, clean", className: syne.className, italic: false, weight: 700 },
  { name: "Classic", desc: "Refined, timeless, elegant", className: newsreader.className, italic: true, weight: 300 },
];

// ---------------------------------------------------------------------
// GLSL smoke shader (Fractional Brownian Motion)
// ---------------------------------------------------------------------
const SmokeShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_speed: 0.15,
    u_density: 0.4,
    u_color: new THREE.Color("#ffffff"),
    u_velocity_impact: 0.0,
  },
  // Vertex shader — fullscreen triangle/quad
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  // Fragment shader — FBM smoke
  `
    uniform float u_time;
    uniform float u_speed;
    uniform float u_density;
    uniform vec3 u_color;
    uniform float u_velocity_impact;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                 mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
      for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 p = vUv * 3.0;
      float t = u_time * (u_speed + u_velocity_impact);

      vec2 q = vec2(0.0);
      q.x = fbm(p + vec2(0.0, 0.0));
      q.y = fbm(p + vec2(5.2, 1.3));

      vec2 r = vec2(0.0);
      r.x = fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.4);
      r.y = fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.2);

      float f = fbm(p + 4.0 * r);

      float smoke_alpha = smoothstep(0.1, 0.9, f * u_density);
      vec3 final_color = mix(vec3(0.97, 0.97, 0.97), u_color, smoke_alpha);

      gl_FragColor = vec4(final_color, 1.0);
    }
  `,
);

extend({ SmokeShaderMaterial });

// The material instance — drei exposes the uniforms as direct properties.
type SmokeMaterial = THREE.ShaderMaterial & {
  u_time: number;
  u_speed: number;
  u_density: number;
  u_velocity_impact: number;
  u_color: THREE.Color;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    smokeShaderMaterial: ThreeElements["shaderMaterial"];
  }
}

function SmokeBackground({ shaderRef }: { shaderRef: RefObject<SmokeMaterial | null> }) {
  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.u_time = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <smokeShaderMaterial ref={shaderRef as RefObject<THREE.ShaderMaterial>} />
    </mesh>
  );
}

// ---------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------
export default function BrandArchitect() {
  const shaderRef = useRef<SmokeMaterial | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // The three nodes sit in a row inside the 300vw container, so each step is
  // a third of the container width (xPercent is relative to that width).
  const steps = [
    { id: "intro", xp: 0 },
    { id: "niche", xp: -100 / 3 },
    { id: "aesthetics", xp: -200 / 3 },
  ];

  const currentStepIndex = useRef(0);

  const handleStepTransition = (direction: number) => {
    const nextIndex = currentStepIndex.current + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    currentStepIndex.current = nextIndex;
    const targetStep = steps[nextIndex];

    if (shaderRef.current) {
      let targetDensity = 0.4;
      if (targetStep.id === "niche") targetDensity = 0.65;
      else if (targetStep.id === "aesthetics") targetDensity = 0.3;

      gsap.killTweensOf(shaderRef.current);
      gsap
        .timeline()
        .to(shaderRef.current, {
          u_velocity_impact: 1.2,
          u_density: targetDensity,
          duration: 0.4,
          ease: "power2.in",
        })
        .to(shaderRef.current, {
          u_velocity_impact: 0.0,
          duration: 1.2,
          ease: "power4.out",
        });
    }

    gsap.to(canvasWrapperRef.current, {
      xPercent: targetStep.xp,
      scale: 0.95,
      duration: 1.2,
      ease: "expo.inOut",
      onComplete: () => {
        gsap.to(canvasWrapperRef.current, { scale: 1.0, duration: 0.4 });
      },
    });
  };

  useEffect(() => {
    const observer = Observer.create({
      target: window,
      type: "wheel,touch",
      debounce: true,
      tolerance: 50,
      onDown: () => handleStepTransition(1),
      onUp: () => handleStepTransition(-1),
    });
    return () => observer.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F9F9F9]">
      {/* Layer 1: fixed WebGL shader background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 1] }}>
          <SmokeBackground shaderRef={shaderRef} />
        </Canvas>
      </div>

      {/* Layer 2: infinite GSAP panning canvas */}
      <div
        ref={canvasWrapperRef}
        className="absolute top-0 left-0 flex flex-wrap w-[300vw] h-[200vh] z-10"
      >
        {/* Node 1 — Welcome (0vw, 0vh) */}
        <div className="w-screen h-screen flex items-center justify-center p-24">
          <div className="max-w-xl text-center">
            <h1 className="text-sm tracking-[0.3em] uppercase text-black/40 mb-4">
              The Brand Architect
            </h1>
            <p className="text-3xl font-light text-black/80 tracking-tight leading-relaxed">
              Let&rsquo;s unearth your visual identity. Scroll to begin the audit.
            </p>
          </div>
        </div>

        {/* Node 2 — Niche selection glass panel (-100vw, 0vh) */}
        <div className="w-screen h-screen flex items-center justify-center p-24">
          <div className="w-full max-w-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-12 relative overflow-hidden">
            <h2 className="text-xs tracking-[0.2em] uppercase text-black/50 mb-8">
              01 / Define Your Niche
            </h2>
            <div className="space-y-6">
              {["Luxury Real Estate", "Medical Spa & Wellness", "Disruptive Tech Startup"].map(
                (niche) => (
                  <button
                    key={niche}
                    type="button"
                    className="w-full text-left py-4 px-6 border border-black/5 hover:border-black/20 bg-white/40 hover:bg-white/80 rounded-xl tracking-tight font-light text-lg transition-all duration-300"
                  >
                    {niche}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Node 3 — Aesthetics / typographic voice */}
        <div className="w-screen h-screen flex items-center justify-center p-24">
          <div className="w-full max-w-3xl">
            <h2 className="text-xs tracking-[0.2em] uppercase text-black/50 mb-3 text-center">
              02 / Your Typographic Voice
            </h2>
            <p className="text-center text-black/40 font-light tracking-tight mb-10">
              Type carries tone. Choose the one that sounds like you.
            </p>
            <div className="space-y-4">
              {TYPE_VOICES.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  className="group w-full flex items-center gap-6 sm:gap-10 py-6 px-8 bg-white/30 hover:bg-white/70 border border-black/5 hover:border-black/15 rounded-2xl backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-500 text-left"
                >
                  <span
                    className={`${v.className} text-5xl sm:text-6xl text-black/85 w-16 sm:w-20 text-center shrink-0 leading-none`}
                    style={{ fontStyle: v.italic ? "italic" : "normal", fontWeight: v.weight }}
                  >
                    Aa
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`${v.className} block text-xl sm:text-2xl text-black/85 tracking-tight truncate`}
                      style={{ fontStyle: v.italic ? "italic" : "normal", fontWeight: v.weight }}
                    >
                      Posts that sound like you.
                    </span>
                    <span className="block mt-1.5 text-xs sm:text-sm text-black/45 tracking-tight">
                      <span className="text-black/65 font-medium">{v.name}</span> — {v.desc}
                    </span>
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 text-black/30 text-xl transition-all duration-300 shrink-0">
                    &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
