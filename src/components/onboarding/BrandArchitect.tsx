"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveBrandEngine, fetchBrandEngine } from "@/lib/brand-engine-api";
import { Skeleton, ErrorState } from "@/components/dashboard/StateViews";
import { INDUSTRIES, getIndustry } from "@/lib/industries";
import type { OnboardingAnswers } from "@/lib/brand-book-schema";
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

// Social platforms the user can connect (Step 1). Profile URLs are captured in
// local state; backend persistence (Meta OAuth / profile store) is a follow-up.
type SocialPlatform = { id: string; label: string; placeholder: string; icon: ReactNode };
const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "facebook.com/yourpage",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.3 0-1.3-.1-2.4-.1-2.3 0-3.9 1.4-3.9 4v2.3H7.9v3.1h2.6V21h3z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "instagram.com/yourhandle",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X",
    placeholder: "x.com/yourhandle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 3h3l-6.6 7.6L21.8 21h-6l-4.7-6.1L5.7 21H2.6l7-8.1L2.2 3h6.1l4.3 5.6L17.5 3zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5z" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "tiktok.com/@yourhandle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.5 3c.3 2 1.5 3.6 3.5 3.9v2.6c-1.3.1-2.5-.3-3.6-1v5.9c0 3-2.2 5.6-5.4 5.6A5.3 5.3 0 0 1 5.5 14c0-3 2.5-5.4 5.6-5.1v2.7c-.4-.1-.8-.2-1.1-.2-1.4 0-2.5 1.2-2.5 2.6 0 1.5 1.1 2.6 2.5 2.6 1.5 0 2.6-1.2 2.6-2.7V3h2.4z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    placeholder: "linkedin.com/in/you",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6.2 9H3.5v9.5h2.7V9zM4.85 4.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM20.5 18.5v-5.2c0-2.8-1.5-4.1-3.5-4.1-1.6 0-2.3.9-2.7 1.5V9h-2.7v9.5h2.7v-5c0-.3 0-.6.1-.8.2-.6.8-1.2 1.7-1.2 1.2 0 1.7.9 1.7 2.2v4.8h2.7z" />
      </svg>
    ),
  },
];

// Frosted workspace panel — mirrors the dashboard .panel/.tile card system
// (rgba(255,255,255,0.72), blur(22px) saturate(1.5), 24px radius, white/62 hairline).
const CARD = "w-full arch-panel";

export default function BrandArchitect() {
  const [step, setStep] = useState(0); // 0 intro · 1 profiles · 2 niche · 3 tone · 4 typography+vibe
  const [brandData, setBrandData] = useState({
    niche: "",
    pivotAnswer: "",
    paletteVibe: 50, // 0 = clinical / neutral, 100 = vibrant / contrast
    typographyPairing: "",
  });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // Step 1 — selected social profiles. Key present = selected; value = profile URL.
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const togglePlatform = (id: string) =>
    setProfiles((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: "" };
    });
  const setProfileUrl = (id: string, url: string) =>
    setProfiles((prev) => ({ ...prev, [id]: url }));
  const selectedPlatforms = SOCIAL_PLATFORMS.filter((p) => p.id in profiles);

  // Identity + industry — the real OnboardingAnswers inputs the brand-book
  // generator needs (ported from the classic wizard). Step 2 collects these.
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [location, setLocation] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [bookState, setBookState] = useState<"idle" | "generating" | "error">("idle");

  // Map the collected flow → OnboardingAnswers. Target client + content focus
  // are derived from the chosen industry's taxonomy defaults (Stage 2 will let
  // the user refine these + add personality/voice samples).
  const buildAnswers = (): OnboardingAnswers => {
    const ind = getIndustry(industryId);
    const toneMap: Record<string, OnboardingAnswers["tonePreference"]> = {
      "Warm & personal": "warm",
      "Polished & professional": "professional",
      "Bold & playful": "playful",
      "Refined & premium": "authoritative",
    };
    const tone = toneMap[brandData.pivotAnswer] ?? "warm";
    const traitLabel: Record<OnboardingAnswers["tonePreference"], string> = {
      warm: "Warm",
      professional: "Professional",
      playful: "Energetic",
      authoritative: "Premium",
    };
    const social = selectedPlatforms
      .map((p) => profiles[p.id])
      .filter((u) => u && u.trim())
      .join(", ");
    return {
      name: name.trim() || "Owner",
      brokerage: business.trim() || undefined,
      industry: industryId || undefined,
      profession: ind?.defaultProfessionTitle,
      location: location.trim() || "Local Area",
      markets: location.trim() ? [location.trim()] : ["Local"],
      targetClient: ind
        ? ind.clientArchetypes.slice(0, 3).map((a) => a.label).join(", ")
        : "Local customers",
      personalityTraits: [traitLabel[tone]],
      tonePreference: tone,
      contentFocus: ind ? ind.contentFocus.slice(0, 4).map((c) => c.label) : ["Updates"],
      fontPairing: brandData.typographyPairing || undefined,
      social: social || undefined,
    };
  };

  // READ PATH — hydrate the Niche / Tone / Vibe pickers from the Postgres
  // brandEngine JSON column (GET /api/brand-engine, RLS-scoped via withTenantDb)
  // so a returning user edits their saved DNA instead of a blank slate.
  const [hydrate, setHydrate] = useState<"loading" | "ready" | "error">("loading");

  const loadBrandEngine = useCallback(async () => {
    setHydrate("loading");
    try {
      const dna = (await fetchBrandEngine()) as
        | {
            niche?: string;
            primaryTone?: string;
            contrastVibe?: string | number;
            paletteVibe?: number;
            typographyPairing?: string;
          }
        | null;
      if (dna && typeof dna === "object") {
        setBrandData((prev) => ({
          niche: typeof dna.niche === "string" ? dna.niche : prev.niche,
          pivotAnswer:
            typeof dna.primaryTone === "string" ? dna.primaryTone : prev.pivotAnswer,
          paletteVibe:
            typeof dna.contrastVibe === "number"
              ? dna.contrastVibe
              : typeof dna.contrastVibe === "string" &&
                  dna.contrastVibe.trim() !== "" &&
                  !Number.isNaN(Number(dna.contrastVibe))
                ? Number(dna.contrastVibe)
                : typeof dna.paletteVibe === "number"
                  ? dna.paletteVibe
                  : prev.paletteVibe,
          typographyPairing:
            typeof dna.typographyPairing === "string"
              ? dna.typographyPairing
              : prev.typographyPairing,
        }));
      }
      setHydrate("ready");
    } catch {
      setHydrate("error");
    }
  }, []);

  useEffect(() => {
    void loadBrandEngine();
  }, [loadBrandEngine]);

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Generic tone question (decoupled from the old demo niches). The chosen
  // option maps to OnboardingAnswers.tonePreference in buildAnswers().
  const currentPivot = {
    title: "03 / Your Tone",
    question: "When you talk to your customers, what feels most like you?",
    options: [
      "Warm & personal",
      "Polished & professional",
      "Bold & playful",
      "Refined & premium",
    ],
  };

  return (
    <div className="architect-stage relative min-h-screen w-full flex items-center justify-center overflow-hidden px-6 py-20">
      <style>{`
        .architect-stage {
          /* Exact dashboard shell void — cool off-white + faint posterboy-red glow
             (1:1 with .pb-home2 in dashboard-home-styles.tsx). */
          --ink: #1c1c1e;
          --ink-soft: #76767e;
          --line: rgba(20,20,30,0.07);
          --card: rgba(255,255,255,0.72);
          --red: #ee2532;
          --red-deep: #c81e2a;
          color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          background:
            radial-gradient(1100px 520px at 88% -8%, rgba(238,37,50,0.06), transparent 60%),
            linear-gradient(165deg, #eef0f2 0%, #e9ebee 55%, #edeff1 100%);
        }
        /* Frosted workspace panel — identical geometry to dashboard widgets. */
        .arch-panel {
          background: var(--card);
          backdrop-filter: blur(22px) saturate(1.5);
          -webkit-backdrop-filter: blur(22px) saturate(1.5);
          border: 1px solid rgba(255,255,255,0.62);
          border-radius: 24px;
          box-shadow: 0 24px 60px -38px rgba(20,20,40,0.4), inset 0 1px 0 rgba(255,255,255,0.7);
        }
        /* Editorial micro-label — same uppercase/tracking idiom as dashboard nav + section labels. */
        .arch-eyebrow { font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; }
        /* Primary panel title — stark high-contrast ink, tight tracking (matches dashboard view titles). */
        .arch-title { color: var(--ink); letter-spacing: -0.5px; }
        /* Selectable control — brand-red active accent (matches active dashboard metrics/nav). */
        .arch-opt {
          border: 1px solid var(--line); background: rgba(255,255,255,0.5);
          border-radius: 16px; color: var(--ink);
          transition: all .25s cubic-bezier(0.22,1,0.36,1);
        }
        .arch-opt:hover { background: rgba(255,255,255,0.82); border-color: rgba(20,20,30,0.14); }
        .arch-opt.on {
          border-color: var(--red); background: rgba(255,255,255,0.92);
          box-shadow: 0 12px 26px -16px rgba(238,37,50,0.5), inset 0 0 0 1px rgba(238,37,50,0.32);
        }
        .arch-range { accent-color: var(--red); }
        /* Social connect — icon toggles + per-profile URL fields. */
        .arch-social {
          width: 64px; height: 64px; border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--line); background: rgba(255,255,255,0.5);
          color: #4a4a52; cursor: pointer;
          transition: all .25s cubic-bezier(0.22,1,0.36,1);
          opacity: 0; animation: architectFade 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .arch-social:hover { background: rgba(255,255,255,0.85); border-color: rgba(20,20,30,0.16); transform: translateY(-2px); }
        .arch-social.on {
          border-color: var(--red); color: var(--red); background: #fff;
          box-shadow: 0 14px 28px -16px rgba(238,37,50,0.55), inset 0 0 0 1px rgba(238,37,50,0.32);
        }
        .arch-social-ic { width: 26px; height: 26px; display: block; }
        .arch-social-ic svg { width: 100%; height: 100%; display: block; }
        .arch-field {
          display: flex; align-items: center; gap: 12px;
          border: 1px solid var(--line); background: rgba(255,255,255,0.6);
          border-radius: 14px; padding: 0 14px; height: 50px;
          transition: border-color .2s, box-shadow .2s;
        }
        .arch-field:focus-within { border-color: var(--red); box-shadow: inset 0 0 0 1px rgba(238,37,50,0.3); }
        .arch-field-ic { width: 18px; height: 18px; color: var(--ink-soft); flex-shrink: 0; display: block; }
        .arch-field-ic svg { width: 100%; height: 100%; display: block; }
        .arch-field-input {
          flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
          font-size: 14px; color: var(--ink); font-family: inherit;
        }
        .arch-field-input::placeholder { color: #a3a3ab; }
        @media (prefers-reduced-motion: reduce) { .arch-social { animation: none; opacity: 1; } }
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
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-[3px] w-10 rounded-full transition-all duration-500 ${
              i <= step ? "bg-[#ee2532]" : "bg-black/10"
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

      {/* READ STATE → StateViews (warm-light frames) while we hydrate the DNA */}
      {hydrate === "loading" ? (
        <div className="architect-fade w-full max-w-2xl space-y-4">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-[280px] w-full rounded-3xl" />
        </div>
      ) : hydrate === "error" ? (
        <div className="architect-fade w-full max-w-md">
          <ErrorState
            message="We couldn't reach your Brand Engine. Check your connection and try again."
            onRetry={() => void loadBrandEngine()}
          />
        </div>
      ) : (
      /* Stage — remounts per step so the fade replays */
      <div key={step} className="architect-fade w-full flex items-center justify-center">
        {step === 0 && (
          <div className="max-w-xl text-center">
            <h1 className="mb-5 text-base sm:text-lg font-light text-[#76767e]">
              I&rsquo;m{" "}
              <span
                className="font-medium text-[#1c1c1e]"
                style={{ fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}
              >
                poster<span style={{ fontStyle: "italic" }}>boy</span>
              </span>
              , it&rsquo;s nice to meet you.
            </h1>
            <p className="arch-title text-3xl sm:text-4xl font-semibold tracking-tight leading-snug mb-10">
              Let&rsquo;s get to know each other.
            </p>
            <button
              type="button"
              onClick={next}
              className="px-9 py-4 bg-[#ee2532] text-white rounded-2xl text-xs font-medium uppercase tracking-[0.2em] shadow-[0_18px_38px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all"
            >
              Begin
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={`${CARD} max-w-2xl p-12`}>
            <h2 className="arch-eyebrow mb-3" style={{ letterSpacing: "0.2em" }}>
              01 / Connect Your Profiles
            </h2>
            <p className="arch-title text-xl font-medium tracking-tight mb-8">
              Select the profiles you want to connect.
            </p>

            {/* Icon picker — fades in with a stagger */}
            <div className="flex flex-wrap justify-center gap-4">
              {SOCIAL_PLATFORMS.map((p, i) => {
                const on = p.id in profiles;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    aria-pressed={on}
                    aria-label={p.label}
                    className={`arch-social ${on ? "on" : ""}`}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span className="arch-social-ic">{p.icon}</span>
                  </button>
                );
              })}
            </div>

            {/* URL field per selected profile — revealed below the picker */}
            {selectedPlatforms.length > 0 && (
              <div className="mt-8 space-y-3">
                {selectedPlatforms.map((p) => (
                  <div key={p.id} className="arch-field architect-fade">
                    <span className="arch-field-ic">{p.icon}</span>
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={profiles[p.id]}
                      onChange={(e) => setProfileUrl(p.id, e.target.value)}
                      placeholder={p.placeholder}
                      className="arch-field-input"
                      aria-label={`${p.label} profile URL`}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={next}
              className="mt-10 w-full bg-[#ee2532] text-white rounded-2xl py-4 text-xs font-medium uppercase tracking-[0.2em] shadow-[0_18px_38px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all"
            >
              {selectedPlatforms.length > 0 ? "Continue" : "Skip for now"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={`${CARD} max-w-2xl p-12`}>
            <h2 className="arch-eyebrow mb-2" style={{ letterSpacing: "0.2em" }}>
              02 / Tell us about your business
            </h2>
            <p className="arch-title text-xl font-medium tracking-tight mb-6">
              The basics — so your posts actually sound like you.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="arch-field">
                <input
                  className="arch-field-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Your name"
                />
              </div>
              <div className="arch-field">
                <input
                  className="arch-field-input"
                  placeholder="Business name"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  aria-label="Business name"
                />
              </div>
            </div>
            <div className="arch-field mb-7">
              <input
                className="arch-field-input"
                placeholder="City / area you serve"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="City or area you serve"
              />
            </div>

            <div className="arch-eyebrow mb-3" style={{ letterSpacing: "0.2em" }}>
              What kind of business?
            </div>
            <div className="grid sm:grid-cols-2 gap-3 max-h-[42vh] overflow-y-auto pr-1">
              {INDUSTRIES.filter((i) => i.id !== "other-general").map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => {
                    setIndustryId(ind.id);
                    setBrandData((prev) => ({ ...prev, niche: ind.label }));
                  }}
                  className={`arch-opt text-left p-4 ${industryId === ind.id ? "on" : ""}`}
                >
                  <div className="font-medium text-[15px] tracking-tight">{ind.label}</div>
                  <div className="text-[12px] text-[#76767e] mt-0.5 leading-snug">{ind.description}</div>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!name.trim() || !industryId}
              onClick={next}
              className="mt-7 w-full bg-[#ee2532] text-white rounded-2xl py-4 text-xs font-medium uppercase tracking-[0.2em] shadow-[0_18px_38px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={`${CARD} max-w-2xl p-12`}>
            <h2 className="arch-eyebrow mb-6" style={{ letterSpacing: "0.2em" }}>
              {currentPivot.title}
            </h2>
            <p className="arch-title text-xl font-medium tracking-tight leading-relaxed mb-8">
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
                  className={`arch-opt py-6 px-4 text-center tracking-tight font-light ${
                    brandData.pivotAnswer === option ? "on" : ""
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="w-full max-w-5xl arch-panel p-16 grid md:grid-cols-2 gap-12 md:gap-20">
            {/* Left: type-pairing selectors */}
            <div className="space-y-5">
              <div>
                <h2 className="arch-eyebrow" style={{ letterSpacing: "0.2em" }}>
                  04 / Typography Engine
                </h2>
                <p className="text-sm font-light text-[#76767e] mt-2">
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
                  className={`arch-opt block w-full text-left rounded-2xl p-6 ${
                    brandData.typographyPairing === pair.id ? "on" : ""
                  }`}
                >
                  <div className="text-[11px] font-mono text-[#76767e] mb-2 tracking-tight">
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
                <h2 className="arch-eyebrow" style={{ letterSpacing: "0.2em" }}>
                  05 / Visual Contrast Matrix
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] tracking-wider uppercase text-[#76767e]">
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
                    className="arch-range w-full h-[2px] appearance-none rounded-lg bg-black/15 cursor-ew-resize"
                  />
                  <div className="text-center text-xs font-mono text-[#76767e]">
                    {brandData.paletteVibe}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled={saving || !industryId || !name.trim()}
                  onClick={async () => {
                    // Build the brand book: assemble OnboardingAnswers → generate
                    // (Claude voice) → persist to the workspace → into the app.
                    setBookState("generating");
                    setSaving(true);
                    setSaveNote(null);
                    try {
                      // Also save the brand DNA — feeds the AI caption/image voice.
                      saveBrandEngine(brandData).catch(() => {});
                      const answers = buildAnswers();
                      const res = await fetch("/api/brand-book/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ answers }),
                      });
                      const data = await res.json();
                      if (!res.ok || data.error || !data.brandBook) {
                        throw new Error(data.error || "generate failed");
                      }
                      const { persistBrandBookToWorkspace } = await import("@/lib/brand-book-client");
                      await persistBrandBookToWorkspace({
                        brandBook: data.brandBook,
                        onboardingAnswers: answers,
                      });
                      const { syncBrandBookToOrganization } = await import("@/lib/onboarding-brand-sync");
                      syncBrandBookToOrganization(data.brandBook);
                      router.push("/dashboard/brand");
                    } catch {
                      setBookState("error");
                      setSaving(false);
                      setSaveNote("Couldn't build your brand book — sign in and try again.");
                    }
                  }}
                  className="w-full bg-[#ee2532] text-white rounded-2xl py-5 text-xs font-medium uppercase tracking-[0.2em] shadow-[0_22px_44px_-20px_rgba(238,37,50,0.75)] hover:bg-[#c81e2a] transition-all disabled:opacity-50"
                >
                  {bookState === "generating" ? "Building your brand book…" : "Build my brand book"}
                </button>
                {bookState === "error" && saveNote && (
                  <div className="text-[11px] tracking-wide text-[#76767e] text-center">{saveNote}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
