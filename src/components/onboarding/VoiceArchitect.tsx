"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Inter } from "next/font/google";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import AiPillPrompt from "@/components/onboarding/AiPillPrompt";
import PersonalityOrbit from "@/components/onboarding/PersonalityOrbit";
import { fetchDashboardLocations } from "@/lib/dashboard-api";
import { buildMetaLoginUrl } from "@/lib/meta-connect-client";
import { saveBrandEngine } from "@/lib/brand-engine-api";
import {
  cacheHistorySignals,
  cacheStoredBrandBook,
  cacheStoredOnboardingAnswers,
  markOnboardingComplete,
  syncPendingVerticalSlug,
} from "@/lib/onboarding-brand-sync";
import {
  buildVoiceOnboardingAnswers,
  mergeHistoryIntoVoiceAnswers,
  VOICE_PERSONALITIES,
  type VoicePersonalityId,
} from "@/lib/voice-profile";
import type { ZeroShotHistoryResult } from "@/lib/zero-shot-extraction";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const CONNECT_PROVIDERS = [
  {
    id: "meta" as const,
    label: "Facebook & Instagram",
    example: "Authorize Meta to scan recent posts.",
    ready: true,
  },
  {
    id: "linkedin" as const,
    label: "LinkedIn",
    example: "Authorize LinkedIn for company or personal.",
    ready: true,
  },
  {
    id: "tiktok" as const,
    label: "TikTok",
    example: "Authorize TikTok for business or creator.",
    ready: true,
  },
  {
    id: "youtube" as const,
    label: "YouTube",
    example: "Coming soon — channel voice next.",
    ready: false,
  },
] as const;

type Step =
  | "name"
  | "what"
  | "where"
  | "personality"
  | "never"
  | "connect"
  | "analyze"
  | "build";

const STEP_ORDER: Step[] = [
  "name",
  "what",
  "where",
  "personality",
  "never",
  "connect",
  "analyze",
  "build",
];

const DRAFT_KEY = "posterboy-voice-onboarding-draft";

type Draft = {
  businessName: string;
  whatYouDo: string;
  where: string;
  personalityId: VoicePersonalityId | null;
  neverSoundLike: string;
};

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function VoiceArchitectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildStarted = useRef(false);
  const analyzeStarted = useRef(false);
  const historyRef = useRef<ZeroShotHistoryResult | null>(null);
  const connectGridRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<Step>("name");
  const [businessName, setBusinessName] = useState("");
  const [whatYouDo, setWhatYouDo] = useState("");
  const [where, setWhere] = useState("");
  const [personalityId, setPersonalityId] = useState<VoicePersonalityId | null>(null);
  const [neverSoundLike, setNeverSoundLike] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [analyzeNote, setAnalyzeNote] = useState<string | null>(null);
  const [usedHistory, setUsedHistory] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setReducedMotion(
      typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    );
    const draft = loadDraft();
    if (draft) {
      setBusinessName(draft.businessName || "");
      setWhatYouDo(draft.whatYouDo || "");
      setWhere(draft.where || "");
      setPersonalityId(
        draft.personalityId &&
          VOICE_PERSONALITIES.some((p) => p.id === draft.personalityId)
          ? draft.personalityId
          : null,
      );
      setNeverSoundLike(draft.neverSoundLike || "");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ businessName, whatYouDo, where, personalityId, neverSoundLike });
  }, [hydrated, businessName, whatYouDo, where, personalityId, neverSoundLike]);

  useEffect(() => {
    if (!hydrated) return;
    const connected =
      searchParams.get("meta_connected") === "1" ||
      searchParams.get("linkedin_connected") === "1" ||
      searchParams.get("tiktok_connected") === "1";
    const connectErr =
      searchParams.get("meta_error") ||
      searchParams.get("linkedin_error") ||
      searchParams.get("tiktok_error");
    const stepParam = searchParams.get("step");
    if (connectErr) {
      setError(
        "Couldn’t finish connecting. Continue without it — you can connect anytime in Settings.",
      );
      setConnectBusy(false);
      setStep("connect");
      router.replace("/onboarding", { scroll: false });
    } else if (connected) {
      setStep("analyze");
      router.replace("/onboarding", { scroll: false });
    } else if (searchParams.get("connect")) {
      setStep("connect");
      router.replace("/onboarding", { scroll: false });
    } else if (stepParam && (STEP_ORDER as string[]).includes(stepParam)) {
      setStep(stepParam as Step);
      router.replace("/onboarding", { scroll: false });
    }
  }, [searchParams, router, hydrated]);

  const go = useCallback((next: Step) => {
    setError(null);
    setStep(next);
  }, []);

  const advanceFrom = useCallback(
    (current: Step) => {
      // Skip analyze unless we arrived via Meta connect (handled separately).
      if (current === "connect") {
        go("build");
        return;
      }
      const i = STEP_ORDER.indexOf(current);
      go(STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)]);
    },
    [go],
  );

  const stageBodyRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const el = stageBodyRef.current;
      if (!el || !hydrated) return;
      if (reducedMotion) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
        return;
      }
      // Pill / personality run their own entrances; keep panel steps soft.
      if (step === "connect" || step === "analyze" || step === "build") {
        const tw = gsap.fromTo(
          el,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" },
        );
        const failsafe = window.setTimeout(() => {
          if (tw.progress() < 1) tw.progress(1);
        }, 2500);
        return () => window.clearTimeout(failsafe);
      }
    },
    { dependencies: [step, reducedMotion, hydrated] },
  );

  const useCurrentLocation = useCallback(() => {
    setLocationHint(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationHint("Location isn’t available in this browser — type your city below.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(
            `/api/geocode/reverse?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
          );
          const d = (await r.json()) as { place?: string; error?: string };
          if (!r.ok || !d.place?.trim()) {
            setLocationHint("Couldn’t place you on the map — type your city below.");
            return;
          }
          setWhere(d.place.trim());
          setLocationHint(null);
        } catch {
          setLocationHint("Couldn’t place you on the map — type your city below.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationHint("Location permission blocked — allow it, or type your city below.");
        } else {
          setLocationHint("Couldn’t get your location — type your city below.");
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    );
  }, []);

  const onConnectPointerMove = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const cards = connectGridRef.current?.querySelectorAll<HTMLElement>(".va-feature");
      if (!cards?.length) return;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--x", String(ev.clientX - rect.left));
        card.style.setProperty("--y", String(ev.clientY - rect.top));
      });
    },
    [reducedMotion],
  );

  const startSocialConnect = useCallback(
    async (provider: "meta" | "linkedin" | "tiktok") => {
      setConnectBusy(true);
      setError(null);
      saveDraft({ businessName, whatYouDo, where, personalityId, neverSoundLike });
      try {
        const me = await fetch("/api/me", { credentials: "same-origin" });
        if (!me.ok) {
          const next = encodeURIComponent(`/onboarding?connect=${provider}`);
          window.location.href = `/sign-in?next=${next}`;
          return;
        }
        const locations = await fetchDashboardLocations();
        const locationId = locations[0]?.id;
        if (!locationId) {
          setError("Your workspace is still setting up. Sign in again, then reconnect.");
          setConnectBusy(false);
          return;
        }
        if (provider === "meta") {
          window.location.href = buildMetaLoginUrl(locationId, "onboarding");
          return;
        }
        const params = new URLSearchParams({
          locationId,
          returnTo: "onboarding",
        });
        window.location.href = `/api/auth/${provider}/login?${params.toString()}`;
      } catch {
        setError("Could not start connection. Try again, or continue without connecting.");
        setConnectBusy(false);
      }
    },
    [businessName, whatYouDo, where, personalityId, neverSoundLike],
  );

  const runAnalyze = useCallback(async () => {
    if (analyzeStarted.current) return;
    analyzeStarted.current = true;
    setAnalyzeNote(null);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/analyze-history", { method: "POST" });
      const data = (await res.json()) as {
        analyzed?: boolean;
        voice?: ZeroShotHistoryResult;
        error?: string;
      };
      if (data?.analyzed && data.voice) {
        historyRef.current = data.voice;
        setUsedHistory(true);
        cacheHistorySignals({
          hashtags: data.voice.hashtags ?? [],
          postingCadence: data.voice.postingCadence ?? "",
          mediaMix: data.voice.mediaMix ?? "",
          visualStyle: data.voice.visualStyle ?? [],
        });
        setAnalyzeNote("Pulled captions, posting cadence, and media mix from your pages.");
      } else {
        historyRef.current = null;
        setUsedHistory(false);
        setAnalyzeNote(
          "No post history found yet — we'll use the voice you just set. You can connect later.",
        );
      }
    } catch {
      historyRef.current = null;
      setUsedHistory(false);
      setAnalyzeNote("Couldn't read history right now — continuing with the voice you set.");
    }
    // Brief beat so the status line is readable, then build.
    window.setTimeout(() => go("build"), reducedMotion ? 400 : 1200);
  }, [go, reducedMotion]);

  const runBuild = useCallback(async () => {
    if (buildStarted.current) return;
    buildStarted.current = true;
    setError(null);
    try {
      const draft = loadDraft();
      const base = buildVoiceOnboardingAnswers({
        businessName: businessName || draft?.businessName || "",
        whatYouDo: whatYouDo || draft?.whatYouDo || "",
        where: where || draft?.where || "",
        personalityId: personalityId || draft?.personalityId || null,
        neverSoundLike: neverSoundLike || draft?.neverSoundLike || "",
      });
      const answers = mergeHistoryIntoVoiceAnswers(base, historyRef.current);

      await saveBrandEngine({
        niche: (whatYouDo || draft?.whatYouDo || answers.profession || "").trim(),
        primaryTone: answers.tonePreference,
        industryId: "other-general",
      }).catch(() => {});

      const res = await fetch("/api/brand-book/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.brandBook) {
        throw new Error(data.error || "generate failed");
      }

      cacheStoredBrandBook(data.brandBook);
      cacheStoredOnboardingAnswers(answers);
      markOnboardingComplete();

      if (data.authMode === "guest") {
        router.push("/sign-in?next=%2Fdashboard");
        return;
      }

      try {
        const { persistBrandBookToWorkspace } = await import("@/lib/brand-book-client");
        await persistBrandBookToWorkspace({
          brandBook: data.brandBook,
          onboardingAnswers: answers,
        });
        await syncPendingVerticalSlug();
      } catch {
        /* local cache is enough until they sign in */
      }

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }

      router.push("/dashboard");
    } catch {
      buildStarted.current = false;
      setError("Couldn't build your voice. Check your connection and try again.");
    }
  }, [businessName, whatYouDo, where, personalityId, neverSoundLike, router]);

  useEffect(() => {
    if (step !== "analyze" || !hydrated) return;
    void runAnalyze();
  }, [step, hydrated, runAnalyze]);

  useEffect(() => {
    if (step !== "build" || !hydrated) return;
    void runBuild();
  }, [step, hydrated, runBuild]);

  const progress = useMemo(() => {
    const i = STEP_ORDER.indexOf(step);
    return ((i + 1) / STEP_ORDER.length) * 100;
  }, [step]);

  if (!hydrated) {
    return <div className="va-stage" aria-busy="true" />;
  }

  return (
    <div className={`va-stage ${inter.className}`}>
      <header className="va-top">
        <Link href="/" className="va-logo" aria-label="Posterboy home">
          poster<em>boy</em>
        </Link>
        <span className="va-ai-badge">Powered by AI</span>
      </header>

      <div className="va-progress" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="va-stage-body" key={step} ref={stageBodyRef}>
        {step === "name" && (
          <AiPillPrompt
            question="What's the name of your business?"
            support="As it appears on your site and socials."
            value={businessName}
            onChange={setBusinessName}
            onSubmit={() => {
              if (!businessName.trim()) return;
              advanceFrom("name");
            }}
          />
        )}

        {step === "what" && (
          <AiPillPrompt
            question="What kind of business is this?"
            support="e.g. med spa, real estate, coffee shop"
            value={whatYouDo}
            onChange={setWhatYouDo}
            onSubmit={() => {
              if (!whatYouDo.trim()) return;
              advanceFrom("what");
            }}
          />
        )}

        {step === "where" && (
          <AiPillPrompt
            question="Where do you operate?"
            support="For local captions — weather, events, neighborhood shoutouts."
            value={where}
            onChange={(v) => {
              setWhere(v);
              if (locationHint) setLocationHint(null);
            }}
            onSubmit={() => {
              if (!where.trim()) return;
              advanceFrom("where");
            }}
            autoComplete="address-level2"
            actionLabel="Use my current location"
            onAction={useCurrentLocation}
            actionBusy={locating}
            hint={locationHint}
          />
        )}

        {step === "personality" && (
          <PersonalityOrbit
            value={personalityId}
            onChange={setPersonalityId}
            onContinue={() => {
              if (!personalityId) return;
              advanceFrom("personality");
            }}
            businessName={businessName}
            whatYouDo={whatYouDo}
            where={where}
            reducedMotion={reducedMotion}
          />
        )}

        {step === "never" && (
          <AiPillPrompt
            question="What should you never sound like?"
            support="Optional. Salesy, corporate, try-hard — whatever to avoid."
            value={neverSoundLike}
            onChange={setNeverSoundLike}
            onSubmit={() => advanceFrom("never")}
            skipLabel="Skip for now"
            onSkip={() => {
              setNeverSoundLike("");
              advanceFrom("never");
            }}
          />
        )}

        {step === "connect" && (
          <div className="va-connect">
            <div className="va-connect-head">
              <p className="va-connect-kicker">Optional</p>
              <h2 className="va-connect-title">Connect your social profiles</h2>
              <p className="va-connect-support">
                Authorize a network so we can read recent captions, media mix, and cadence — then
                mirror what already works. Nothing publishes without your approval.
              </p>
            </div>

            <div
              ref={connectGridRef}
              className="va-features va-features--connect"
              onPointerMove={onConnectPointerMove}
            >
              {CONNECT_PROVIDERS.map((o) => (
                <div
                  key={o.id}
                  className={`va-feature${o.ready ? "" : " is-soon"}`}
                >
                  <button
                    type="button"
                    className="va-feature-content"
                    disabled={connectBusy || !o.ready}
                    onClick={() => {
                      if (!o.ready) return;
                      if (o.id === "meta" || o.id === "linkedin" || o.id === "tiktok") {
                        void startSocialConnect(o.id);
                      }
                    }}
                  >
                    <strong>{o.label}</strong>
                    <span>{connectBusy && o.ready ? "Connecting…" : o.example}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="va-connect-primary">
              <button
                type="button"
                className="va-voice-cta"
                disabled={connectBusy}
                onClick={() => {
                  setError(null);
                  go("build");
                }}
              >
                Skip — continue without connecting
              </button>
              {error ? <p className="va-error">{error}</p> : null}
            </div>
          </div>
        )}

        {step === "analyze" && (
          <div className="va-panel va-panel--status" role="status" aria-live="polite">
            <span className="va-status-orb" aria-hidden>
              <span className="va-status-orb-halo" />
              <span className="va-status-orb-ring" />
              <span className="va-status-orb-well">
                <span className="va-blob va-blob--status">
                  <span className="va-blob-a" />
                  <span className="va-blob-b" />
                  <span className="va-blob-c" />
                </span>
              </span>
            </span>
            <p className="va-panel-kicker">Reading your feed</p>
            <h2 className="va-panel-title">Analyzing your post history</h2>
            <p className="va-panel-copy">
              Captions, media mix, and cadence — so your voice matches what you already publish.
            </p>
            {analyzeNote ? <p className="va-analyze-note">{analyzeNote}</p> : null}
          </div>
        )}

        {step === "build" && (
          <div className="va-panel va-panel--status" role="status" aria-live="polite">
            <span className="va-status-orb" aria-hidden>
              <span className="va-status-orb-halo" />
              <span className="va-status-orb-ring" />
              <span className="va-status-orb-well">
                <span className="va-blob va-blob--status">
                  <span className="va-blob-a" />
                  <span className="va-blob-b" />
                  <span className="va-blob-c" />
                </span>
              </span>
            </span>
            <p className="va-panel-kicker">Almost there</p>
            <h2 className="va-panel-title">Building your voice</h2>
            <p className="va-panel-copy">
              {usedHistory
                ? `Combining your personality with patterns from ${businessName.trim() || "your"} feed.`
                : `Setting captions to sound like ${businessName.trim() || "your business"}.`}
            </p>
            {error ? (
              <button
                type="button"
                className="va-btn"
                onClick={() => {
                  buildStarted.current = false;
                  void runBuild();
                }}
              >
                <span>Try again</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {step !== "build" && step !== "analyze" && STEP_ORDER.indexOf(step) > 0 ? (
        <button
          type="button"
          className="va-back"
          onClick={() => {
            const i = STEP_ORDER.indexOf(step);
            const prev = STEP_ORDER[Math.max(0, i - 1)];
            // Don't back into analyze from connect.
            go(prev === "analyze" ? "never" : prev);
          }}
        >
          Back
        </button>
      ) : null}

      <style>{`
        .va-stage {
          --ink: #141418;
          --red: #ee2532;
          --paper: #f7f4ee;
          position: relative;
          min-height: 100dvh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 88px 20px 48px;
          color: var(--ink);
          font-family: inherit;
          background:
            radial-gradient(900px 420px at 85% -10%, rgba(238, 37, 50, 0.06), transparent 55%),
            linear-gradient(165deg, #f7f4ee 0%, #f3f0e9 50%, #f6f4ef 100%);
          overflow-x: clip;
          overflow-y: auto;
        }
        .va-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px clamp(16px, 3vw, 28px);
        }
        .va-logo {
          font-family: var(--font-instrument-serif), Georgia, serif;
          font-size: 22px;
          color: var(--ink);
          text-decoration: none;
        }
        .va-logo em { font-style: italic; color: var(--red); }
        .va-ai-badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(20, 20, 24, 0.32);
        }
        .va-blob {
          position: relative;
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          filter: blur(0.3px);
        }
        .va-blob--status { width: 58px; height: 58px; }
        .va-blob-a,
        .va-blob-b,
        .va-blob-c {
          position: absolute;
          inset: 0;
        }
        .va-blob-a {
          background: radial-gradient(circle at 32% 28%, #ff6b7a 0%, #ee2532 42%, #c81e2a 100%);
          border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%;
          opacity: 0.98;
          animation: va-morph-a 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          box-shadow:
            0 10px 28px rgba(200, 30, 42, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .va-blob-b {
          inset: 2px;
          background: linear-gradient(145deg, rgba(255, 140, 160, 0.9) 0%, #ee2532 50%, #a01822 100%);
          border-radius: 58% 42% 45% 55% / 52% 58% 42% 48%;
          opacity: 0.55;
          mix-blend-mode: soft-light;
          animation: va-morph-b 3.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite reverse;
        }
        .va-blob-c {
          inset: -2px;
          background: radial-gradient(
            circle at 38% 32%,
            rgba(255, 255, 255, 0.55) 0%,
            rgba(255, 180, 190, 0.18) 38%,
            transparent 68%
          );
          border-radius: 50% 40% 60% 45% / 45% 55% 40% 60%;
          animation: va-morph-c 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        @keyframes va-morph-a {
          0%, 100% {
            border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%;
            transform: rotate(0deg) scale(1);
          }
          33% {
            border-radius: 60% 40% 48% 52% / 40% 60% 45% 55%;
            transform: rotate(14deg) scale(1.06);
          }
          66% {
            border-radius: 48% 52% 40% 60% / 55% 45% 58% 42%;
            transform: rotate(-10deg) scale(0.96);
          }
        }
        @keyframes va-morph-b {
          0%, 100% {
            border-radius: 58% 42% 45% 55% / 52% 58% 42% 48%;
            transform: translate(1px, -1px) scale(1);
          }
          50% {
            border-radius: 40% 60% 55% 45% / 60% 40% 55% 45%;
            transform: translate(-2px, 2px) scale(1.08);
          }
        }
        @keyframes va-morph-c {
          0%, 100% {
            border-radius: 50% 40% 60% 45% / 45% 55% 40% 60%;
            transform: rotate(0deg);
            opacity: 0.9;
          }
          50% {
            border-radius: 40% 60% 45% 55% / 60% 40% 55% 45%;
            transform: rotate(28deg);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .va-blob-a,
          .va-blob-b,
          .va-blob-c,
          .va-status-orb-halo,
          .va-status-orb-ring { animation: none; }
        }
        .va-progress {
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(20, 20, 24, 0.06);
        }
        .va-progress span {
          display: block;
          height: 100%;
          background: var(--red);
          transition: width 0.35s ease;
        }
        .va-stage-body {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .va-panel {
          width: min(480px, 92vw);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .va-panel--status {
          gap: 0;
        }
        .va-status-orb {
          position: relative;
          display: grid;
          place-items: center;
          width: 148px;
          height: 148px;
          margin: 0 0 28px;
        }
        .va-status-orb-halo {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(238, 37, 50, 0.22) 0%,
            rgba(238, 37, 50, 0.08) 42%,
            transparent 70%
          );
          filter: blur(10px);
          animation: va-orb-breathe 3.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .va-status-orb-ring {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          border: 1px solid rgba(238, 37, 50, 0.16);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.35),
            0 0 0 10px rgba(238, 37, 50, 0.03);
          animation: va-orb-ring 4.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .va-status-orb-well {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 104px;
          height: 104px;
          border-radius: 50%;
          padding: 3px;
          background:
            linear-gradient(165deg, rgba(255, 255, 255, 0.78), rgba(247, 244, 238, 0.55)),
            rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(20, 20, 24, 0.06);
          box-shadow:
            0 18px 40px rgba(20, 20, 24, 0.08),
            0 2px 6px rgba(20, 20, 24, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(18px) saturate(1.2);
        }
        .va-status-orb-well::before {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.7), transparent 46%),
            linear-gradient(180deg, rgba(247, 244, 238, 0.95), rgba(236, 232, 224, 0.9));
          box-shadow: inset 0 1px 2px rgba(20, 20, 24, 0.04);
          z-index: 0;
        }
        .va-status-orb-well .va-blob {
          position: relative;
          z-index: 1;
        }
        @keyframes va-orb-breathe {
          0%, 100% { transform: scale(0.92); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes va-orb-ring {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        .va-panel-kicker {
          margin: 0 0 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(20, 20, 24, 0.42);
        }
        .va-panel-title {
          margin: 0 0 12px;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 750;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: var(--ink);
        }
        .va-panel-copy {
          margin: 0 0 28px;
          max-width: 38ch;
          font-size: 15.5px;
          line-height: 1.55;
          color: rgba(20, 20, 24, 0.55);
          font-weight: 500;
        }
        .va-panel--status .va-panel-copy {
          margin-bottom: 0;
        }
        .va-connect {
          width: min(720px, 94vw);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 24px;
        }
        .va-connect-head {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .va-connect-kicker {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(20, 20, 24, 0.42);
        }
        .va-connect-title {
          margin: 0;
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 750;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: var(--ink);
        }
        .va-connect-support {
          margin: 0 auto;
          max-width: 42ch;
          font-size: 13px;
          line-height: 1.45;
          color: rgba(20, 20, 24, 0.48);
          font-weight: 500;
        }
        /* Connect-step only — keep scoped so PersonalityOrbit cards aren't clamped. */
        .va-connect .va-features {
          width: 100%;
          display: grid;
          gap: 0.35rem;
        }
        .va-connect .va-features--connect {
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(2, minmax(118px, 1fr));
        }
        .va-connect .va-feature {
          --x: 80;
          --y: 52;
          --x-px: calc(var(--x) * 1px);
          --y-px: calc(var(--y) * 1px);
          --border: 2px;
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(20, 20, 24, 0.08);
          min-height: 118px;
        }
        .va-connect .va-feature::before,
        .va-connect .va-feature::after {
          content: "";
          display: block;
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(
            420px circle at var(--x-px) var(--y-px),
            rgba(238, 37, 50, 0.45),
            transparent 42%
          );
        }
        .va-connect .va-feature::before {
          z-index: 1;
          opacity: 0.55;
        }
        .va-connect .va-feature::after {
          opacity: 0;
          z-index: 2;
          transition: opacity 0.4s ease;
          background: radial-gradient(
            520px circle at var(--x-px) var(--y-px),
            rgba(238, 37, 50, 0.7),
            transparent 40%
          );
        }
        .va-connect .va-feature:hover:not(.is-soon)::after {
          opacity: 1;
        }
        .va-connect .va-feature.is-soon {
          opacity: 0.72;
        }
        .va-connect .va-feature-content {
          position: absolute;
          inset: var(--border);
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.35rem;
          padding: 1rem 1.1rem;
          border: 0;
          border-radius: calc(14px - 1px);
          background: rgba(247, 244, 238, 0.96);
          color: #141418;
          text-align: left;
          cursor: pointer;
          transition: background 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-connect .va-feature-content:disabled {
          cursor: not-allowed;
        }
        .va-connect .va-feature.is-soon .va-feature-content {
          cursor: not-allowed;
        }
        .va-connect .va-feature-content:focus-visible {
          outline: 2px solid #141418;
          outline-offset: 2px;
        }
        .va-connect .va-feature-content > strong {
          font-size: 15.5px;
          font-weight: 750;
          letter-spacing: -0.02em;
        }
        .va-connect .va-feature-content > span {
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.4;
          opacity: 0.58;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .va-connect-primary {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .va-voice-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 220px;
          min-height: 44px;
          padding: 0 28px;
          border: 1px solid rgba(20, 20, 24, 0.12);
          border-radius: 999px;
          background: transparent;
          color: rgba(20, 20, 24, 0.45);
          font-size: 14px;
          font-weight: 650;
          letter-spacing: -0.015em;
          cursor: pointer;
          transition:
            background 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            border-color 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            color 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-voice-cta.is-ready {
          border-color: #ee2532;
          background: #ee2532;
          color: #fff;
        }
        .va-voice-cta.is-ready:hover:not(:disabled) {
          background: #c81e2a;
          border-color: #c81e2a;
        }
        .va-voice-cta.is-ready:active:not(:disabled) { transform: scale(0.98); }
        .va-voice-cta:hover:not(:disabled):not(.is-ready) {
          border-color: rgba(20, 20, 24, 0.28);
          color: #141418;
        }
        .va-voice-cta:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .va-voice-cta.is-ready svg {
          transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-voice-cta.is-ready:hover:not(:disabled) svg {
          transform: translateX(2px);
        }
        @media (max-width: 560px) {
          .va-connect .va-features--connect {
            grid-template-columns: 1fr;
            grid-template-rows: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .va-connect .va-feature::before,
          .va-connect .va-feature::after {
            display: none;
          }
          .va-connect .va-feature {
            background: rgba(20, 20, 24, 0.06);
            border: 1px solid rgba(20, 20, 24, 0.08);
          }
          .va-connect .va-feature-content {
            inset: 0;
          }
        }
        .va-analyze-note {
          margin: 18px 0 0;
          max-width: 36ch;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.45;
          color: rgba(20, 20, 24, 0.55);
        }
        .va-connect-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          width: 100%;
        }
        .va-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          padding: 6px 8px 6px 22px;
          border: 0;
          border-radius: 999px;
          background: var(--red);
          color: #fff;
          font-size: 15px;
          font-weight: 750;
          letter-spacing: -0.015em;
          cursor: pointer;
          transition:
            background 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            opacity 0.28s cubic-bezier(0.32, 0.72, 0, 1),
            transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-btn:hover:not(:disabled) { background: #c81e2a; }
        .va-btn:active:not(:disabled) { transform: scale(0.98); }
        .va-btn:disabled { opacity: 0.6; cursor: progress; }
        .va-btn.is-busy { padding-inline: 24px; }
        .va-btn-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .va-btn:hover:not(:disabled) .va-btn-icon {
          transform: translateX(2px);
        }
        .va-btn-ghost {
          min-height: 40px;
          padding: 0 12px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: rgba(20, 20, 24, 0.5);
          font-size: 13.5px;
          font-weight: 650;
          text-decoration: underline;
          text-underline-offset: 4px;
          cursor: pointer;
        }
        .va-btn-ghost:hover { color: var(--ink); }
        .va-error {
          margin: 18px 0 0;
          font-size: 13.5px;
          color: var(--red);
        }
        .va-back {
          position: absolute;
          bottom: max(24px, env(safe-area-inset-bottom));
          left: clamp(16px, 3vw, 28px);
          border: 0;
          background: none;
          font-size: 12px;
          font-weight: 650;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(20, 20, 24, 0.4);
          cursor: pointer;
        }
        .va-back:hover { color: var(--ink); }
      `}</style>
    </div>
  );
}

/** Origin-style voice onboarding — warm-light immersive shell. */
export default function VoiceArchitect() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f7f4ee]" aria-busy="true" />}>
      <VoiceArchitectInner />
    </Suspense>
  );
}
