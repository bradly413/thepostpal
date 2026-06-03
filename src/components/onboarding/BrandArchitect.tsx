"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBrandEngine } from "@/lib/brand-engine-api";
import { Fraunces, Syne } from "next/font/google";

// Real type specimens for the typography engine.
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

const CARD =
  "w-full bg-white/45 backdrop-blur-2xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)] rounded-3xl";
const OPTION_BASE =
  "border rounded-xl tracking-tight font-light transition-all duration-300";
const OPTION_OFF = "border-black/10 bg-white/40 hover:bg-white/80 hover:border-black/20";
const OPTION_ON = "border-black/70 bg-white/90 shadow-md";

export default function BrandArchitect() {
  const [step, setStep] = useState(0); // 0 intro · 1 niche · 2 pivot · 3 typography
  const [brandData, setBrandData] = useState({
    niche: "",
    pivotAnswer: "",
    paletteVibe: 50, // 0 = clinical / neutral, 100 = vibrant / contrast
    typographyPairing: "",
  });
  const [compiled, setCompiled] = useState(false);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // The 02 question is driven by the niche picked in step 1.
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

  return (
    <div className="architect-stage relative min-h-screen w-full flex items-center justify-center overflow-hidden px-6 py-20">
      <style>{`
        .architect-stage {
          background-color: #f4f5f7;
          background-image:
            radial-gradient(130% 110% at 50% -10%, #ffffff 0%, #f5f6f8 48%, #eceef2 100%),
            radial-gradient(70% 70% at 85% 105%, rgba(212,168,83,0.06), transparent 60%);
        }
        @keyframes architectFade {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        .architect-fade { animation: architectFade 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .architect-fade { animation: none; }
        }
      `}</style>

      {/* Progress */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-[3px] w-10 rounded-full transition-all duration-500 ${
              i <= step ? "bg-black/60" : "bg-black/10"
            }`}
          />
        ))}
      </div>

      {/* Back */}
      {step > 0 && (
        <button
          type="button"
          onClick={back}
          className="absolute top-7 left-8 text-[11px] uppercase tracking-[0.2em] text-black/40 hover:text-black/75 transition-colors"
        >
          &larr; Back
        </button>
      )}

      {/* Stage — remounts per step so the fade replays */}
      <div key={step} className="architect-fade w-full flex items-center justify-center">
        {step === 0 && (
          <div className="max-w-xl text-center">
            <h1 className="text-xs tracking-[0.3em] uppercase text-black/40 mb-5">
              The Brand Architect
            </h1>
            <p className="text-3xl sm:text-4xl font-light text-black/80 tracking-tight leading-snug mb-10">
              Let&rsquo;s unearth your visual identity.
            </p>
            <button
              type="button"
              onClick={next}
              className="px-9 py-4 bg-black text-white rounded-2xl text-xs font-light uppercase tracking-[0.2em] shadow-xl hover:bg-black/80 transition-all"
            >
              Begin
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={`${CARD} max-w-2xl p-12`}>
            <h2 className="text-xs tracking-[0.2em] uppercase text-black/50 mb-8">
              01 / Define Your Niche
            </h2>
            <div className="space-y-5">
              {["Luxury Real Estate", "Medical Spa & Wellness", "Disruptive Tech Startup"].map(
                (niche) => (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => {
                      setBrandData((prev) => ({ ...prev, niche }));
                      next();
                    }}
                    className={`w-full text-left py-4 px-6 text-lg ${OPTION_BASE} ${
                      brandData.niche === niche ? `${OPTION_ON} translate-x-1` : OPTION_OFF
                    }`}
                  >
                    {niche}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={`${CARD} max-w-2xl p-12`}>
            <h2 className="text-xs tracking-[0.2em] uppercase text-black/50 mb-6">
              {currentPivot.title}
            </h2>
            <p className="text-xl font-light text-black/90 tracking-tight leading-relaxed mb-8">
              {currentPivot.question}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {currentPivot.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setBrandData((prev) => ({ ...prev, pivotAnswer: option }));
                    next();
                  }}
                  className={`py-6 px-4 text-center ${OPTION_BASE} ${
                    brandData.pivotAnswer === option ? OPTION_ON : OPTION_OFF
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-5xl bg-white/10 backdrop-blur-[40px] border border-white/40 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-16 grid md:grid-cols-2 gap-12 md:gap-20">
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
                  className={`w-full text-left ${
                    brandData.typographyPairing === pair.id
                      ? "border border-black bg-white/30 shadow-md rounded-2xl p-6"
                      : "border border-black/10 bg-transparent hover:bg-white/20 transition-all duration-500 rounded-2xl p-6"
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
            <div className="flex flex-col justify-between gap-10 md:border-l border-black/5 md:pl-12">
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
                  disabled={saving || !brandData.niche}
                  onClick={async () => {
                    setSaving(true);
                    setSaveNote(null);
                    try {
                      await saveBrandEngine(brandData);
                      setSaveNote("Brand Engine saved to your workspace.");
                    } catch {
                      setSaveNote("Showing your DNA — sign in to save it to your workspace.");
                    } finally {
                      setSaving(false);
                      setCompiled(true);
                    }
                  }}
                  className="w-full bg-black text-white rounded-2xl py-5 text-xs font-light tracking-[0.2em] shadow-2xl hover:bg-black/80 transition-all disabled:opacity-50"
                >
                  {saving ? "Synthesizing…" : "Synthesize Brand Engine"}
                </button>
                {compiled && (
                  <>
                    {saveNote && (
                      <div className="text-[11px] tracking-wide text-black/50 text-center">{saveNote}</div>
                    )}
                    <pre className="bg-black/5 backdrop-blur-md border border-black/10 rounded-2xl p-6 font-mono text-[10px] uppercase text-black/50 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(brandData, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="w-full bg-[#ee2532] text-white rounded-2xl py-4 text-xs font-light tracking-[0.2em] shadow-xl hover:opacity-90 transition-all"
                    >
                      Enter Posterboy
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
