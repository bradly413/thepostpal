"use client";

import { useRef, useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, extend, type ThreeElements } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";
import { Fraunces, Syne } from "next/font/google";

gsap.registerPlugin(Observer);

// Real type specimens for the typography engine (node 4).
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });
const syne = Syne({ subsets: ["latin"], weight: ["500", "700"] });

const TYPE_PAIRS = [
  {
    id: "serif-editorial",
    label: "Fraunces — Editorial Serif",
    preview: "The Art of Space",
    className: fraunces.className,
    style: { fontStyle: "italic", fontWeight: 400 } as const,
  },
  {
    id: "brutalist-sans",
    label: "Syne — Brutalist Display",
    preview: "SCALE_01 // SYSTEM",
    className: syne.className,
    style: { fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" } as const,
  },
  {
    id: "clean-minimal",
    label: "Inter — Clean Minimal",
    preview: "Less is premium.",
    className: "font-sans",
    style: { fontWeight: 300 } as const,
  },
];

// ---------------------------------------------------------------------
// GLSL smoke shader (Fractional Brownian Motion)
// ---------------------------------------------------------------------
const SmokeShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_speed: 0.15,
    u_density: 0.55,
    u_color: new THREE.Color("#9aa1ab"), // soft cool grey mist — visible on the near-white page
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

      float smoke_alpha = smoothstep(0.0, 0.85, f * u_density);
      vec3 final_color = mix(vec3(0.976, 0.976, 0.976), u_color, smoke_alpha);

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

  const [brandData, setBrandData] = useState({
    niche: "",
    pivotAnswer: "",
    paletteVibe: 50, // 0 = clinical / neutral, 100 = vibrant / contrast
    typographyPairing: "",
  });
  const [compiled, setCompiled] = useState(false);

  // The 02 question is driven by the niche picked in node 2.
  const getPivotQuestion = () => {
    switch (brandData.niche) {
      case "Luxury Real Estate":
        return {
          title: "02 / Editorial Tone",
          question:
            "Do you prefer your property narratives to focus on architectural pedigree, or emotional lifestyle and neighborhood amenities?",
          options: ["Architectural Pedigree", "Lifestyle & Amenities"],
        };
      case "Medical Spa & Wellness":
        return {
          title: "02 / Clinical Focus",
          question:
            "Should your brand voice lead with technical clinical expertise and raw results, or soft luxury wellness and a sanctuary experience?",
          options: ["Clinical Expertise", "Sanctuary & Wellness"],
        };
      case "Disruptive Tech Startup":
        return {
          title: "02 / Market Position",
          question:
            "Does your product positioning lean toward being a highly disruptive industry challenger, or an enterprise-grade, institutional partner?",
          options: ["Disruptive Challenger", "Enterprise-Grade"],
        };
      default:
        return {
          title: "02 / Brand Focus",
          question: "Select a niche to unlock your brand's primary tone matrix.",
          options: [] as string[],
        };
    }
  };
  const currentPivot = getPivotQuestion();

  // Four nodes on a 2D canvas (300vw x 200vh, flex-wrap): three across the top
  // row, the fourth wraps to row two. xPercent / yPercent are relative to the
  // container's own width / height, so a column step is -100/3 of the width and
  // a row step is -50 of the height.
  const steps = [
    { id: "intro", xp: 0, yp: 0 },
    { id: "niche", xp: -100 / 3, yp: 0 },
    { id: "pivot", xp: -200 / 3, yp: 0 },
    { id: "typography", xp: 0, yp: -50 },
  ];

  const currentStepIndex = useRef(0);

  const handleStepTransition = (direction: number) => {
    const nextIndex = currentStepIndex.current + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    currentStepIndex.current = nextIndex;
    const targetStep = steps[nextIndex];

    if (shaderRef.current) {
      let targetDensity = 0.55;
      if (targetStep.id === "niche") targetDensity = 0.75;
      else if (targetStep.id === "pivot") targetDensity = 0.6;
      else if (targetStep.id === "typography") targetDensity = 0.5;

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
      yPercent: targetStep.yp,
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
      {/* Layer 0: CSS fog fallback — shows through if WebGL is blank / frozen /
          disabled (e.g. some embedded preview panes), so the background is
          never dead-flat white. The opaque WebGL smoke covers it when it runs. */}
      <style>{`
        @keyframes architect-fog-drift {
          0%   { transform: scale(1.15) translate3d(0, 0, 0); }
          50%  { transform: scale(1.3) translate3d(3%, -3%, 0); }
          100% { transform: scale(1.2) translate3d(-3%, 3%, 0); }
        }
        .architect-fog {
          background:
            radial-gradient(55% 50% at 28% 30%, rgba(154,161,171,0.40), transparent 70%),
            radial-gradient(50% 55% at 72% 62%, rgba(154,161,171,0.34), transparent 70%),
            radial-gradient(45% 45% at 50% 85%, rgba(120,128,140,0.30), transparent 72%),
            radial-gradient(40% 40% at 80% 15%, rgba(170,177,185,0.30), transparent 72%);
          filter: blur(40px);
          animation: architect-fog-drift 26s ease-in-out infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) {
          .architect-fog { animation: none; }
        }
      `}</style>
      <div className="architect-fog fixed inset-0 z-0 pointer-events-none" />

      {/* Layer 1: fixed WebGL shader background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 1] }}
          frameloop="always"
          dpr={[1, 2]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            // In dev, repeated HMR full-reloads can exhaust WebGL contexts and
            // leave the smoke frozen. Letting the browser auto-restore a lost
            // context keeps the background alive instead of going static.
            gl.domElement.addEventListener(
              "webglcontextlost",
              (e) => e.preventDefault(),
              false,
            );
          }}
        >
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
                    onClick={() => {
                      setBrandData((prev) => ({ ...prev, niche }));
                      handleStepTransition(1);
                    }}
                    className={`w-full text-left py-4 px-6 border rounded-xl tracking-tight font-light text-lg transition-all duration-300 ${
                      brandData.niche === niche
                        ? "border-black/70 bg-white/90 shadow-md translate-x-2"
                        : "border-black/5 hover:border-black/20 bg-white/40 hover:bg-white/80"
                    }`}
                  >
                    {niche}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Node 3 — Dynamic pivot question (driven by the niche in node 2) */}
        <div className="w-screen h-screen flex items-center justify-center p-24">
          <div className="w-full max-w-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-12 relative overflow-hidden">
            <h2 className="text-xs tracking-[0.2em] uppercase text-black/50 mb-6">
              {currentPivot.title}
            </h2>
            <p className="text-xl font-light text-black/90 tracking-tight leading-relaxed mb-8">
              {currentPivot.question}
            </p>
            {currentPivot.options.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {currentPivot.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setBrandData((prev) => ({ ...prev, pivotAnswer: option }));
                      handleStepTransition(1);
                    }}
                    className={`py-6 px-4 text-center border rounded-xl tracking-tight font-light transition-all duration-300 ${
                      brandData.pivotAnswer === option
                        ? "border-black/70 bg-white/90 shadow-md"
                        : "border-black/5 hover:border-black/20 bg-white/40 hover:bg-white/80"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-light text-black/40">
                Scroll back up and choose a niche to unlock this step.
              </p>
            )}
          </div>
        </div>

        {/* Node 4 — Typography engine + visual contrast matrix */}
        <div className="w-screen h-screen flex items-center justify-center p-24">
          <div className="w-full max-w-5xl bg-white/10 backdrop-blur-[40px] border border-white/40 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-16 grid grid-cols-2 gap-20">
            {/* Left: type-pairing selectors */}
            <div className="space-y-5">
              <div>
                <h2 className="text-xs tracking-[0.2em] uppercase text-black/50">
                  03 / Typography Engine
                </h2>
                <p className="text-sm font-light text-black/60 mt-2">
                  Choose the visual architecture of your messaging.
                </p>
              </div>
              {TYPE_PAIRS.map((pair) => (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() =>
                    setBrandData((prev) => ({ ...prev, typographyPairing: pair.id }))
                  }
                  className={`w-full text-left rounded-2xl p-6 transition-all duration-500 ${
                    brandData.typographyPairing === pair.id
                      ? "border border-black bg-white/30 shadow-md"
                      : "border border-black/10 bg-transparent hover:bg-white/20"
                  }`}
                >
                  <div className="text-[11px] font-mono text-black/40 mb-2 tracking-tight">
                    {pair.label}
                  </div>
                  <div
                    className={`${pair.className} text-2xl tracking-tight text-black/85`}
                    style={pair.style}
                  >
                    {pair.preview}
                  </div>
                </button>
              ))}
            </div>

            {/* Right: contrast slider + synthesize */}
            <div className="flex flex-col justify-between border-l border-black/5 pl-12">
              <div className="space-y-8">
                <h2 className="text-xs tracking-[0.2em] uppercase text-black/50">
                  04 / Visual Contrast Matrix
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] tracking-wider uppercase text-black/55">
                    <span>Clinical / Neutral</span>
                    <span>Vibrant / Contrast</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brandData.paletteVibe}
                    onChange={(e) =>
                      setBrandData((prev) => ({
                        ...prev,
                        paletteVibe: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-[2px] appearance-none rounded-lg bg-black/15 accent-black cursor-ew-resize"
                  />
                  <div className="text-center text-xs font-mono text-black/40">
                    {brandData.paletteVibe}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setCompiled(true)}
                  className="w-full bg-black text-white rounded-2xl py-5 text-xs font-light uppercase tracking-[0.2em] shadow-2xl hover:bg-black/80 transition-all"
                >
                  Synthesize Brand Engine
                </button>
                {compiled && (
                  <pre className="bg-black/5 backdrop-blur-md border border-black/10 rounded-2xl p-6 font-mono text-[10px] uppercase text-black/50 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(brandData, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
