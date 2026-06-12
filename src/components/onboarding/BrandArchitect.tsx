"use client";

import { useState, useEffect, useCallback, type ReactNode, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { saveBrandEngine, fetchBrandEngine } from "@/lib/brand-engine-api";
import { Skeleton, ErrorState } from "@/components/dashboard/StateViews";
import PosterboyLogo from "@/components/PosterboyLogo";
import { INDUSTRIES, getIndustry } from "@/lib/industries";
import { getPublicTiers } from "@/lib/pricing";
import { saveSelectedPlan } from "@/lib/plan-storage";
import type { OnboardingAnswers } from "@/lib/brand-book-schema";
import {
  COMPLIMENT_OPTIONS,
  DRESS_CODE_OPTIONS,
  DRESS_CODE_TO_FONT_PAIRING,
  DRESS_CODE_TO_TONE,
  GREETING_OPTIONS,
  type ComplimentChoice,
  type DressCodeChoice,
  type GreetingChoice,
} from "@/lib/onboarding-choices";
import PillMultiSelect from "@/components/onboarding/PillMultiSelect";
import PromptRewriteDemo from "@/components/onboarding/PromptRewriteDemo";
import FloatingField from "@/components/onboarding/FloatingField";
import FeatureTour from "@/components/onboarding/FeatureTour";
import BrandVoiceReview from "@/components/onboarding/BrandVoiceReview";
import type { ZeroShotExtraction } from "@/lib/zero-shot-extraction";
import { Users, Sparkles, MapPin, Check, ArrowRight } from "lucide-react";
import { suggestVerticalSlugForIndustry } from "@/lib/compliance/vertical-catalog";
import { updateDashboardVertical } from "@/lib/dashboard-api";
import { cachePendingVerticalSlug } from "@/lib/onboarding-brand-sync";
import {
  cacheStoredBrandBook,
  cacheStoredOnboardingAnswers,
  markOnboardingComplete,
  syncPendingVerticalSlug,
} from "@/lib/onboarding-brand-sync";

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
// Clean Pinterest-style bordered input.
const FIELD =
  "w-full px-4 py-3 rounded-xl bg-white/85 border border-black/[0.1] text-[15px] text-[#1c1c1e] placeholder:text-black/35 focus:border-[#ee2532]/60 focus:outline-none focus:ring-2 focus:ring-[#ee2532]/12 transition-colors";

// Manual brand-voice steps (topics + behavioral) — skipped when the voice was
// already inferred from post history (zero-shot).
const VOICE_STEP_NUMBERS = [5, 6, 7, 8];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BIRTH_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const BIRTH_YEARS = Array.from({ length: 2008 - 1940 + 1 }, (_, i) => String(2008 - i));
// Mirrors the server-side check in src/lib/onboarding-lead.ts — email is required
// before the paid brand-book generate call (gates the Continue on the details step).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSENTS: { key: "terms" | "privacy" | "emails"; label: string; required: boolean }[] = [
  { key: "terms", label: "I agree to the Terms of Service", required: true },
  { key: "privacy", label: "I agree to the Privacy Policy", required: true },
  { key: "emails", label: "Send me tips and product updates (optional)", required: false },
];

function BehavioralPicker<T extends string>({
  question,
  options,
  values,
  onToggle,
  onNext,
  nextDisabled,
  nextLabel = "Next",
}: {
  question: string;
  options: readonly T[];
  /** Multi-select: every chosen option. The first is treated as primary. */
  values: T[];
  onToggle: (v: T) => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="architect-fade w-full max-w-xl">
      <p className="text-[15px] text-[#76767e] mb-3 leading-relaxed">{question}</p>
      <p className="text-[12px] text-[#9a9aa2] mb-6">Pick one or more — the first you choose leads.</p>
      <div className="flex flex-col divide-y divide-black/[0.06]">
        {options.map((opt) => {
          const on = values.includes(opt);
          const primary = on && values[0] === opt && values.length > 1;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt)}
              className="group flex items-start gap-4 py-4 text-left"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors ${
                  on ? "border-[#ee2532] bg-[#ee2532]" : "border-black/25 group-hover:border-black/45"
                }`}
              >
                {on && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" aria-hidden>
                    <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-[16px] font-medium text-[#1c1c1e] leading-snug">
                {opt}
                {primary && <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[#ee2532]">Leads</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-9 flex items-center justify-end gap-2">
        {nextLabel.includes("Building") && (
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#323232]/25 border-t-[#323232] animate-spin"
            aria-hidden
          />
        )}
        <button
          type="button"
          disabled={nextDisabled}
          onClick={onNext}
          className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

export default function BrandArchitect() {
  const [step, setStep] = useState(0); // 0 intro · 1 profiles · 2 loader · 3 business · 4 compliance · 5 topics · 6–8 behavioral
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // Connected social profiles (populated by OAuth in the real flow). Read by
  // buildAnswers for the social handles line.
  const [profiles] = useState<Record<string, string>>({});
  const selectedPlatforms = SOCIAL_PLATFORMS.filter((p) => p.id in profiles);

  // Identity + industry — the real OnboardingAnswers inputs the brand-book
  // generator needs (ported from the classic wizard). Step 2 collects these.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [location, setLocation] = useState("");
  const [industryId, setIndustryId] = useState("");
  // Multi-select industries. industryId stays the PRIMARY (= industryIds[0]) so
  // all industry-scoped steps (target client / content focus) + the generator
  // keep narrowing to one definition; the array carries the full selection.
  const [industryIds, setIndustryIds] = useState<string[]>([]);
  const [bookState, setBookState] = useState<"idle" | "generating" | "error">("idle");

  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [contentFocusIds, setContentFocusIds] = useState<string[]>([]);
  // Behavioral answers are multi-select; the singular value is the primary
  // (= [0]) that drives the 1:1 palette/tone/font mappings, the arrays carry
  // every pick (surfaced to voice synthesis).
  const [dressCode, setDressCode] = useState<DressCodeChoice | "">("");
  const [dressCodes, setDressCodes] = useState<DressCodeChoice[]>([]);
  const [greeting, setGreeting] = useState<GreetingChoice | "">("");
  const [greetings, setGreetings] = useState<GreetingChoice[]>([]);
  const [compliment, setCompliment] = useState<ComplimentChoice | "">("");
  const [compliments, setCompliments] = useState<ComplimentChoice[]>([]);

  // New steps: consent (agree-to-all), birthday, plan selection.
  const [agree, setAgree] = useState({ terms: false, privacy: false, emails: false });
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [plan, setPlan] = useState("");
  const [locating, setLocating] = useState(false);
  // Direction of the last navigation, for the slide transition.
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  // Zero-shot: brand voice inferred from the user's past posts (null until the
  // history analysis returns; manual / guest onboarding falls back when null).
  const [prefilledVoice, setPrefilledVoice] = useState<ZeroShotExtraction | null>(null);

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const d = await r.json();
          const a = d.address ?? {};
          const city = a.city || a.town || a.village || a.hamlet || a.county || "";
          const region = a.state || "";
          const place = [city, region].filter(Boolean).join(", ");
          if (place) setLocation(place);
        } catch {
          /* leave the field for manual entry */
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  const toggleId = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

  // Toggle a value in a multi-select array and return the new array + the
  // resulting primary (first element, or "" when empty).
  function toggleMulti<T extends string>(arr: T[], v: T): { next: T[]; primary: T | "" } {
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    return { next, primary: (next[0] ?? "") as T | "" };
  }

  const buildAnswers = (): OnboardingAnswers => {
    const ind = getIndustry(industryId);
    const tone = dressCode ? DRESS_CODE_TO_TONE[dressCode] : "warm";
    const traitLabel: Record<OnboardingAnswers["tonePreference"], string> = {
      warm: "Welcoming",
      professional: "Polished",
      playful: "Upbeat",
      authoritative: "Refined",
    };
    const archetypeLabels =
      ind && targetIds.length > 0
        ? ind.clientArchetypes
            .filter((a) => targetIds.includes(a.id))
            .map((a) => a.label)
        : [];
    const focusLabels =
      ind && contentFocusIds.length > 0
        ? ind.contentFocus
            .filter((c) => contentFocusIds.includes(c.id))
            .map((c) => c.label)
        : [];
    const social = selectedPlatforms
      .map((p) => profiles[p.id])
      .filter((u) => u && u.trim())
      .join(", ");
    return {
      name: name.trim() || "Owner",
      email: email.trim() || undefined,
      company: business.trim() || undefined,
      industry: industryId || undefined,
      industries:
        industryIds.length > 0
          ? industryIds
          : industryId
            ? [industryId]
            : undefined,
      profession: ind?.defaultProfessionTitle,
      location: location.trim() || "Local Area",
      markets: location.trim() ? [location.trim()] : ["Local"],
      targetClient:
        archetypeLabels.length > 0
          ? archetypeLabels.join(", ")
          : ind
            ? ind.clientArchetypes.slice(0, 2).map((a) => a.label).join(", ")
            : "Local customers",
      personalityTraits:
        archetypeLabels.length > 0 ? archetypeLabels : [traitLabel[tone]],
      tonePreference: tone,
      contentFocus:
        focusLabels.length > 0
          ? focusLabels
          : ind
            ? ind.contentFocus.slice(0, 3).map((c) => c.label)
            : ["Updates"],
      dressCode: dressCode || undefined,
      dressCodes: dressCodes.length > 0 ? dressCodes : undefined,
      greeting: greeting || undefined,
      greetings: greetings.length > 0 ? greetings : undefined,
      compliment: compliment || undefined,
      compliments: compliments.length > 0 ? compliments : undefined,
      fontPairing: dressCode ? DRESS_CODE_TO_FONT_PAIRING[dressCode] : undefined,
      mission: compliment ? `What customers say: ${compliment}` : undefined,
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
            dressCode?: string;
            greeting?: string;
            compliment?: string;
            industryId?: string;
          }
        | null;
      if (dna && typeof dna === "object") {
        if (DRESS_CODE_OPTIONS.includes(dna.dressCode as DressCodeChoice)) {
          setDressCode(dna.dressCode as DressCodeChoice);
          setDressCodes([dna.dressCode as DressCodeChoice]);
        }
        if (GREETING_OPTIONS.includes(dna.greeting as GreetingChoice)) {
          setGreeting(dna.greeting as GreetingChoice);
          setGreetings([dna.greeting as GreetingChoice]);
        }
        if (COMPLIMENT_OPTIONS.includes(dna.compliment as ComplimentChoice)) {
          setCompliment(dna.compliment as ComplimentChoice);
          setCompliments([dna.compliment as ComplimentChoice]);
        }
        if (typeof dna.industryId === "string") {
          setIndustryId(dna.industryId);
          setIndustryIds([dna.industryId]);
        }
      }
      setHydrate("ready");
    } catch {
      setHydrate("error");
    }
  }, []);

  useEffect(() => {
    void loadBrandEngine();
  }, [loadBrandEngine]);

  // Visit order. Step numbers stay stable (so existing blocks don't renumber);
  // only the traversal order changes. New steps: 9 agree · 10 name+age ·
  // 11 location · 12 plan.
  // 0 intro · 10 name+age (first question) · 9 agree · 1 connect · 2 loader ·
  // 14 voice review (zero-shot) · 3 business · 11 location · 4 your-business ·
  // 5 topics · 6 dress · 7 greeting · 8 compliment · 12 plan · 13 feature tour
  const ORDER = [0, 10, 9, 1, 2, 14, 3, 11, 4, 5, 6, 7, 8, 12, 13];
  const next = () => {
    setDir("fwd");
    setStep((s) => {
      let i = Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1);
      // Zero-shot: skip the manual voice steps when we already inferred a voice.
      if (prefilledVoice) {
        while (i < ORDER.length - 1 && VOICE_STEP_NUMBERS.includes(ORDER[i])) i += 1;
      }
      return ORDER[i];
    });
  };
  const back = () => {
    setDir("back");
    setStep((s) => {
      let j = Math.max(ORDER.indexOf(s) - 1, 0);
      // Skip the transient loader (2); when there's no inferred voice skip the
      // zero-shot review (14); when there IS, skip the manual voice steps.
      while (
        j > 0 &&
        (ORDER[j] === 2 ||
          (ORDER[j] === 14 && !prefilledVoice) ||
          (prefilledVoice && VOICE_STEP_NUMBERS.includes(ORDER[j])))
      )
        j -= 1;
      return ORDER[j];
    });
  };

  // "Skip and build manually" — bypass the connect/analysis loader entirely and
  // drop the user into the manual Brand Architect form. Name+age is already
  // collected first, so this lands on the business step. prefilledVoice stays
  // null, so generation uses the manually-entered answers.
  const skipToManual = () => {
    setDir("fwd");
    setStep(3);
  };

  // Auto-apply the guardrail vertical from the business they already picked
  // (changeable later in Settings), then advance. Fire-and-forget — on a guest
  // 401 it caches a pending slug that syncs during generation.
  const confirmVertical = () => {
    const slug = industryId ? suggestVerticalSlugForIndustry(industryId) || "" : "";
    if (slug) {
      try {
        updateDashboardVertical(slug).catch(() => cachePendingVerticalSlug(slug));
      } catch {
        cachePendingVerticalSlug(slug);
      }
    }
    next();
  };

  // Generate the brand book + finish onboarding. Triggered from the final
  // (plan) step; the selected plan is stashed for sign-up to pick up.
  const buildBrandBook = () => {
    void (async () => {
      setBookState("generating");
      setSaving(true);
      setSaveNote(null);
      saveBrandDna();
      try {
        // Stash the chosen plan in the shared store the sign-in/sign-up flow
        // reads — sign-up sends it to /api/auth/signup, which provisions the
        // tenant on that plan.
        if (plan) saveSelectedPlan(plan);
        const base = buildAnswers();
        // Zero-shot: fold the history-inferred (+ edited) voice into the answers
        // — their own phrases become voice samples and the tone adjectives become
        // personality traits, so generation grounds the brand voice in how they
        // already write.
        const answers = prefilledVoice
          ? {
              ...base,
              voiceSamples: [...(base.voiceSamples ?? []), ...prefilledVoice.weSay],
              personalityTraits: prefilledVoice.tone
                .split(/[.•]/)
                .map((t) => t.trim())
                .filter(Boolean),
            }
          : base;
        const res = await fetch("/api/brand-book/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, email: email.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok || data.error || !data.brandBook) {
          throw new Error(data.error || "generate failed");
        }
        cacheStoredBrandBook(data.brandBook);
        cacheStoredOnboardingAnswers(answers);
        markOnboardingComplete();

        // The server returns voice: "structured" | "fallback". Don't silently
        // treat the deterministic fallback as the AI-grade voice — forward a hint
        // so the studio can surface "starter voice" and log it for monitoring.
        const usedFallback = data.voice === "fallback";
        if (usedFallback) {
          console.warn("[onboarding] brand voice fell back to deterministic starter voice");
        }
        const studioHref = usedFallback
          ? "/dashboard/studio?voice=starter"
          : "/dashboard/studio";

        if (data.authMode === "guest") {
          const next = encodeURIComponent(studioHref);
          router.push(`/sign-in?next=${next}`);
          return;
        }
        try {
          const { persistBrandBookToWorkspace } = await import("@/lib/brand-book-client");
          await persistBrandBookToWorkspace({ brandBook: data.brandBook, onboardingAnswers: answers });
          await syncPendingVerticalSlug();
        } catch {
          /* local cache is enough until they sign in */
        }
        // Hand off into MAKING something — the studio now reads the brand book
        // they just built (voice + photography direction), so the payoff of
        // onboarding is their first on-brand post, not a read-only brand page.
        router.push(studioHref);
      } catch {
        setBookState("error");
        setSaving(false);
        setSaveNote("Couldn't build your brand book. Check your connection and try again.");
      }
    })();
  };

  // Auto-advance the "analyzing your social media" loader once it has played.
  useEffect(() => {
    if (step !== 2) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setStep((s) => (s === 2 ? 3 : s)), reduce ? 1000 : 7600);
    return () => clearTimeout(t);
  }, [step]);

  // Zero-shot: while the loader plays, analyze the user's connected accounts'
  // post history and infer their brand voice. On failure / no accounts / guest
  // (no auth), prefilledVoice stays null and onboarding falls back to manual.
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/onboarding/analyze-history", { method: "POST" });
        const data = (await res.json()) as { analyzed?: boolean; voice?: ZeroShotExtraction };
        if (!cancelled && data?.analyzed && data.voice) setPrefilledVoice(data.voice);
      } catch {
        /* fall back to manual onboarding */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  // When the analysis returns a voice, transition the loader into the
  // pre-filled, editable review (step 14) instead of the manual steps.
  useEffect(() => {
    if (step === 2 && prefilledVoice) {
      setDir("fwd");
      setStep(14);
    }
  }, [step, prefilledVoice]);

  const saveBrandDna = () => {
    saveBrandEngine({
      niche: getIndustry(industryId)?.label ?? "",
      industryId,
      dressCode: dressCode || undefined,
      greeting: greeting || undefined,
      compliment: compliment || undefined,
    }).catch(() => {});
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
        /* "Analyzing your social media" file-fly loader (adapted from Uiverse, brand red). */
        .pfile-loader { position: relative; width: 720px; max-width: 90vw; height: 210px; overflow: hidden; }
        .pfile {
          position: absolute; bottom: 50px; width: 96px; height: 120px;
          background: linear-gradient(90deg, #ee2532, #f59aa0);
          border-radius: 14px; transform-origin: center; opacity: 0;
          box-shadow: 0 24px 46px -18px rgba(238,37,50,0.5);
          animation: pfileFly 6s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.95s);
        }
        .pfile::before { content: ""; position: absolute; top: 22px; left: 18px; width: 58px; height: 8px; background: #fff; border-radius: 3px; }
        .pfile::after { content: ""; position: absolute; top: 40px; left: 18px; width: 40px; height: 8px; background: #fff; border-radius: 3px; }
        @keyframes pfileFly {
          0%   { left: -12%; transform: scale(0); opacity: 0; }
          50%  { left: 45%; transform: scale(1.15); opacity: 1; }
          100% { left: 100%; transform: scale(0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .pfile { animation: none; opacity: 0.5; } }
        /* Font specimens animate in with a stagger. */
        .fontspec { opacity: 0; animation: architectFade 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .fontspec { animation: none !important; opacity: 1; } }
        @keyframes architectFade {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        .architect-fade { animation: architectFade 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        /* Directional step transition on the stage wrapper. */
        .arch-slide { animation-duration: 0.5s; animation-timing-function: cubic-bezier(0.22,1,0.36,1); animation-fill-mode: both; }
        .arch-slide--fwd { animation-name: archSlideFwd; }
        .arch-slide--back { animation-name: archSlideBack; }
        @keyframes archSlideFwd { from { opacity: 0; transform: translateX(34px); } to { opacity: 1; transform: none; } }
        @keyframes archSlideBack { from { opacity: 0; transform: translateX(-34px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .architect-fade, .arch-slide { animation: none; }
        }
      `}</style>

      {/* Brand mark — persistent across every step */}
      <div className="absolute top-6 left-8 z-20 text-[#1c1c1e]">
        <PosterboyLogo href="/" size="header" />
      </div>

      {/* Progress — Pinterest-style determinate bar, bottom-left */}
      <div className="absolute top-0 left-0 right-0 z-30 h-[3px] bg-black/[0.06]">
        <div
          className="h-full bg-[#ee2532] transition-all duration-500 ease-out"
          style={{ width: `${((ORDER.indexOf(step) + 1) / ORDER.length) * 100}%` }}
        />
      </div>

      {/* Back */}
      {ORDER.indexOf(step) > 0 && (
        <button
          type="button"
          onClick={back}
          className="absolute top-16 left-8 z-20 text-[11px] uppercase tracking-[0.2em] text-black/40 hover:text-black/75 transition-colors"
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
      <div key={step} className={`arch-slide arch-slide--${dir} w-full flex items-center justify-center`}>
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
              Let&rsquo;s get to postin&rsquo;.
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
          <div className="architect-fade w-full max-w-md">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Connect Posterboy
            </h2>
            <p className="text-[15px] text-[#76767e] mb-8">
              Connect an account and Posterboy reads your recent posts to draft your brand voice
              for you — no typing required. You&apos;ll review and tweak everything next.
            </p>

            <div className="flex flex-col gap-3">
              {[
                { id: "meta", label: "Connect Meta", sub: "Facebook & Instagram" },
                { id: "linkedin", label: "Connect LinkedIn", sub: "Company or personal" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  // SCAFFOLD: real OAuth (redirect → provider → callback persists a
                  // SocialAccount → return here) is the integration point. For now,
                  // advance to the analysis loader, which calls analyze-history.
                  onClick={next}
                  className="group flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-5 py-4 text-left transition-all hover:border-[#ee2532]/40 hover:bg-[#ee2532]/[0.04]"
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-[#1c1c1e]">{o.label}</span>
                    <span className="block text-[12px] text-[#76767e]">{o.sub}</span>
                  </span>
                  <ArrowRight size={18} className="text-[#9a9aa2] transition-colors group-hover:text-[#ee2532]" />
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={skipToManual}
                className="text-[13px] font-medium text-black/45 underline-offset-4 transition-colors hover:text-black/75 hover:underline"
              >
                Skip and build manually
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="architect-fade w-full flex flex-col items-center text-center">
            <p className="arch-title text-2xl sm:text-3xl font-semibold tracking-tight mb-12">
              Posterboy is analyzing your past posts
            </p>
            <div className="pfile-loader">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="pfile" style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="architect-fade w-full max-w-xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Let&apos;s talk business
            </h2>
            <p className="text-[15px] text-[#76767e] mb-7">
              Pick the best fit — it tunes how Posterboy writes and designs for you.
            </p>

            <div className="mb-8">
              <FloatingField label="Business name" value={business} onChange={setBusiness} autoComplete="organization" />
            </div>

            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-1">
              What kind of business?
            </div>
            <div className="flex flex-col divide-y divide-black/[0.06] max-h-[40vh] overflow-y-auto -mx-1 px-1">
              {INDUSTRIES.filter((i) => i.id !== "other-general").map((ind) => {
                const on = industryIds.includes(ind.id);
                const isPrimary = on && industryIds[0] === ind.id && industryIds.length > 1;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const { next, primary } = toggleMulti(industryIds, ind.id);
                      setIndustryIds(next);
                      // Target/content steps are scoped to the PRIMARY industry —
                      // only reset them when the primary actually changes.
                      if (primary !== industryId) {
                        setIndustryId(primary);
                        setTargetIds([]);
                        setContentFocusIds([]);
                      }
                    }}
                    className="group flex items-start gap-4 py-3.5 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors ${
                        on ? "border-[#ee2532] bg-[#ee2532]" : "border-black/25 group-hover:border-black/45"
                      }`}
                    >
                      {on && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" aria-hidden>
                          <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <div className="text-[16px] font-semibold text-[#1c1c1e] leading-tight">
                        {ind.label}
                        {isPrimary && <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[#ee2532]">Leads</span>}
                      </div>
                      <div className="text-[13px] text-[#76767e] mt-0.5 leading-snug">{ind.description}</div>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-9 flex items-center justify-end">
              <button
                type="button"
                disabled={!name.trim() || !industryId}
                onClick={next}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="architect-fade w-full max-w-xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Posterboy has you covered
            </h2>
            <p className="text-[15px] text-[#76767e] mb-6">
              Posterboy already knows what you should and shouldn&apos;t say — no more typos, grammar
              mistakes, or vague captions.
            </p>
            <PromptRewriteDemo businessType={industryId} />
            <div className="mt-9 flex items-center justify-end">
              <button
                type="button"
                onClick={confirmVertical}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="architect-fade w-full max-w-xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Your audience &amp; topics
            </h2>
            <p className="text-[15px] text-[#76767e] mb-6">
              Pick all that apply — we use these to shape your voice and content pillars.
            </p>
            {(() => {
              const ind = getIndustry(industryId);
              if (!ind) return null;
              return (
                <div className="space-y-8">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-3">
                      Who&apos;s your ideal customer?
                    </div>
                    <PillMultiSelect
                      options={ind.clientArchetypes}
                      selected={targetIds}
                      onToggle={(id) => setTargetIds((prev) => toggleId(prev, id))}
                      leadingIcon={<Users size={15} strokeWidth={2} />}
                    />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-3">
                      What do you want to post about?
                    </div>
                    <PillMultiSelect
                      options={ind.contentFocus}
                      selected={contentFocusIds}
                      onToggle={(id) => setContentFocusIds((prev) => toggleId(prev, id))}
                      leadingIcon={<Sparkles size={15} strokeWidth={2} />}
                    />
                  </div>
                </div>
              );
            })()}
            <div className="mt-9 flex items-center justify-end">
              <button
                type="button"
                disabled={!industryId || contentFocusIds.length === 0}
                onClick={next}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="architect-fade w-full max-w-xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              The Dress Code
            </h2>
            <BehavioralPicker
              question="If your business had a dress code, what would it be?"
              options={DRESS_CODE_OPTIONS}
              values={dressCodes}
              onToggle={(v) => {
                const { next: arr, primary } = toggleMulti(dressCodes, v);
                setDressCodes(arr);
                setDressCode(primary);
                saveBrandEngine({
                  industryId,
                  dressCode: primary || undefined,
                  greeting: greeting || undefined,
                  compliment: compliment || undefined,
                }).catch(() => {});
              }}
              onNext={next}
              nextDisabled={dressCodes.length === 0}
            />
          </div>
        )}

        {step === 7 && (
          <div className="architect-fade w-full max-w-xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              The Greeting
            </h2>
            <BehavioralPicker
              question="A new customer walks through the door. How do you greet them?"
              options={GREETING_OPTIONS}
              values={greetings}
              onToggle={(v) => {
                const { next: arr, primary } = toggleMulti(greetings, v);
                setGreetings(arr);
                setGreeting(primary);
                saveBrandDna();
              }}
              onNext={next}
              nextDisabled={greetings.length === 0}
            />
          </div>
        )}

        {step === 8 && (
          <div className="architect-fade w-full max-w-xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              The Compliment
            </h2>
            <BehavioralPicker
              question="What is the best 5-star review a customer could leave you?"
              options={COMPLIMENT_OPTIONS}
              values={compliments}
              onToggle={(v) => {
                const { next: arr, primary } = toggleMulti(compliments, v);
                setCompliments(arr);
                setCompliment(primary);
                saveBrandDna();
              }}
              onNext={next}
              nextDisabled={!compliment || !dressCode || !greeting || !industryId || !name.trim()}
              nextLabel="Next"
            />
            {bookState === "error" && saveNote && (
              <p className="text-[12px] text-[#76767e] text-right mt-3">{saveNote}</p>
            )}
          </div>
        )}

        {step === 9 && (
          <div className="architect-fade w-full max-w-md">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              A couple of quick yeses
            </h2>
            <p className="text-[15px] text-[#76767e] mb-7">
              The housekeeping before we start. Flip them all at once if you like.
            </p>

            {(() => {
              const allOn = agree.terms && agree.privacy && agree.emails;
              return (
                <button
                  type="button"
                  aria-pressed={allOn}
                  onClick={() => setAgree({ terms: !allOn, privacy: !allOn, emails: !allOn })}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#ee2532]/30 bg-[#ee2532]/[0.06] px-4 py-3 mb-2 text-left"
                >
                  <span
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors ${
                      allOn ? "border-[#ee2532] bg-[#ee2532] text-white" : "border-black/25"
                    }`}
                  >
                    {allOn ? <Check size={13} strokeWidth={3} /> : null}
                  </span>
                  <span className="text-[15px] font-semibold text-[#1c1c1e]">Agree to all</span>
                </button>
              );
            })()}

            <div className="flex flex-col divide-y divide-black/[0.06]">
              {CONSENTS.map((c) => {
                const on = agree[c.key];
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAgree((p) => ({ ...p, [c.key]: !p[c.key] }))}
                    className="group flex items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors ${
                        on ? "border-[#ee2532] bg-[#ee2532] text-white" : "border-black/25 group-hover:border-black/45"
                      }`}
                    >
                      {on ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                    <span className="text-[15px] text-[#1c1c1e]">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-9 flex items-center justify-end">
              <button
                type="button"
                disabled={!agree.terms || !agree.privacy}
                onClick={next}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="architect-fade w-full max-w-md">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Let&apos;s confirm a few details
            </h2>
            <p className="text-[15px] text-[#76767e] mb-7">
              This helps us personalize your experience and keep things appropriate.
            </p>
            <div className="mb-4">
              <FloatingField label="Your name" value={name} onChange={setName} autoComplete="name" />
            </div>
            <div className="mb-4">
              <FloatingField
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-2">
              Birthday
            </div>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <select className={FIELD} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} aria-label="Birth month">
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select className={FIELD} value={birthDay} onChange={(e) => setBirthDay(e.target.value)} aria-label="Birth day">
                <option value="">Day</option>
                {BIRTH_DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select className={FIELD} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} aria-label="Birth year">
                <option value="">Year</option>
                {BIRTH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={
                  !name.trim() || !EMAIL_RE.test(email.trim()) || !birthMonth || !birthDay || !birthYear
                }
                onClick={next}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 11 && (
          <div className="architect-fade w-full max-w-md">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Where are you located?
            </h2>
            <p className="text-[15px] text-[#76767e] mb-7">
              Turn on location and we&apos;ll fill in your area — or just type it in.
            </p>
            <button
              type="button"
              onClick={detectLocation}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ee2532]/30 bg-[#ee2532]/[0.06] px-4 py-2.5 text-sm font-semibold text-[#c81e2a] hover:bg-[#ee2532]/10 transition-colors disabled:opacity-50"
              disabled={locating}
            >
              <MapPin size={15} strokeWidth={2} />
              {locating ? "Locating…" : "Use my location"}
            </button>
            <div className="mb-8">
              <FloatingField label="City / area you serve" value={location} onChange={setLocation} autoComplete="address-level2" />
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={!location.trim()}
                onClick={next}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 12 && (
          <div className="architect-fade w-full max-w-3xl">
            <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
              Pick your plan
            </h2>
            <p className="text-[15px] text-[#76767e] mb-7">
              Start where you are. You can change it anytime.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              {getPublicTiers().map((tier) => {
                const on = plan === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPlan(tier.id)}
                    className={`relative text-left rounded-2xl border p-5 transition-all ${
                      on ? "border-[#ee2532] bg-[#ee2532]/[0.06]" : "border-black/10 bg-white/60 hover:border-black/20"
                    }`}
                  >
                    {tier.highlighted ? (
                      <span className="absolute -top-2 right-4 rounded-full bg-[#ee2532] text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
                        Popular
                      </span>
                    ) : null}
                    <div className="text-[16px] font-semibold text-[#1c1c1e]">{tier.name}</div>
                    <div className="mt-1">
                      <span className="text-[26px] font-bold text-[#1c1c1e]">{tier.price}</span>{" "}
                      {tier.priceNote ? <span className="text-[12px] text-[#76767e]">{tier.priceNote}</span> : null}
                    </div>
                    <p className="text-[13px] text-[#76767e] mt-2 leading-snug">{tier.bestFor}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={!plan}
                onClick={next}
                className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 13 && (
          <FeatureTour onFinish={buildBrandBook} generating={bookState === "generating"} />
        )}

        {step === 14 && prefilledVoice && (
          <BrandVoiceReview
            voice={prefilledVoice}
            onChange={setPrefilledVoice}
            onContinue={next}
          />
        )}
      </div>
      )}
    </div>
  );
}
