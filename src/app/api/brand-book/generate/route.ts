import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  guestCookieOptions,
  ONBOARDING_GUEST_COOKIE,
  resolveBrandBookAuth,
} from "@/lib/onboarding-auth";
import { generateBrandBook } from "@/lib/onboarding-agent";
import {
  brandVoiceAiToBrandVoice,
  generateBrandVoiceStructured,
} from "@/lib/brand-book-voice-ai";
import type { OnboardingAnswers } from "@/lib/brand-book-schema";

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-book/generate
//
//  Structured brand voice via Vercel AI SDK generateObject + Zod,
//  then assembles the full BrandBook. Falls back to deterministic
//  industry voice if the model call fails.
//
//  Body: { answers: OnboardingAnswers }
//  Response: { brandBook, voice: "structured" | "fallback" }
// ─────────────────────────────────────────────────────────────

interface RequestBody {
  userId?: unknown;
  answers?: unknown;
}

function isPlausibleAnswers(v: unknown): v is OnboardingAnswers {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) return false;
  const hasBehavioral =
    typeof o.dressCode === "string" &&
    typeof o.greeting === "string" &&
    typeof o.compliment === "string";
  if (hasBehavioral) return true;
  return (
    typeof o.location === "string" &&
    Array.isArray(o.markets) &&
    typeof o.targetClient === "string" &&
    Array.isArray(o.personalityTraits) &&
    typeof o.tonePreference === "string" &&
    Array.isArray(o.contentFocus)
  );
}

function normalizeAnswers(raw: OnboardingAnswers): OnboardingAnswers {
  const tone = raw.tonePreference ?? "warm";
  return {
    ...raw,
    location: raw.location?.trim() || "Local Area",
    markets:
      Array.isArray(raw.markets) && raw.markets.length > 0
        ? raw.markets
        : [raw.location?.trim() || "Local"],
    targetClient: raw.targetClient?.trim() || "Local customers",
    personalityTraits:
      Array.isArray(raw.personalityTraits) && raw.personalityTraits.length > 0
        ? raw.personalityTraits
        : ["Welcoming"],
    tonePreference: tone,
    contentFocus:
      Array.isArray(raw.contentFocus) && raw.contentFocus.length > 0
        ? raw.contentFocus
        : ["Updates"],
  };
}

export async function POST(req: NextRequest) {
  const brandAuth = await resolveBrandBookAuth();
  const userId = brandAuth.userId;

  const ip = getClientIp(req.headers);
  if (!rateLimit(`brand-book-gen:${ip}`, 6, 60_000)) {
    return NextResponse.json(
      { error: "Too many brand-book generations. Wait a moment and retry." },
      { status: 429 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlausibleAnswers(body.answers)) {
    return NextResponse.json(
      { error: "answers payload is missing required fields" },
      { status: 400 },
    );
  }
  const answers = normalizeAnswers(body.answers);

  const shouldAttemptAi =
    Boolean(process.env.ANTHROPIC_API_KEY?.trim()) &&
    (Boolean(answers.dressCode && answers.greeting && answers.compliment) ||
      Boolean(answers.industry?.trim()) ||
      (answers.voiceSamples?.length ?? 0) > 0 ||
      Boolean(answers.mission?.trim()));

  let voiceSource: "structured" | "fallback" = "fallback";

  if (shouldAttemptAi) {
    try {
      const structured = await generateBrandVoiceStructured(answers);
      const brandBook = generateBrandBook(userId, answers, {
        voice: brandVoiceAiToBrandVoice(structured),
        paletteId: structured.paletteId,
        collateralPrompts: structured.collateralPrompts,
      });
      voiceSource = "structured";
      const res = NextResponse.json({
        brandBook,
        voice: voiceSource,
        authMode: brandAuth.mode,
      });
      if (brandAuth.mode === "guest" && brandAuth.setGuestCookie) {
        res.cookies.set(
          ONBOARDING_GUEST_COOKIE,
          brandAuth.setGuestCookie,
          guestCookieOptions(),
        );
      }
      return res;
    } catch (err) {
      console.warn(
        "[brand-book/generate] structured voice failed, falling back:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const brandBook = generateBrandBook(userId, answers);
  const res = NextResponse.json({
    brandBook,
    voice: voiceSource,
    authMode: brandAuth.mode,
  });
  if (brandAuth.mode === "guest" && brandAuth.setGuestCookie) {
    res.cookies.set(
      ONBOARDING_GUEST_COOKIE,
      brandAuth.setGuestCookie,
      guestCookieOptions(),
    );
  }
  return res;
}
