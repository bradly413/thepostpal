import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { requireAuthContext } from "@/lib/api-auth";
import { generateBrandBook } from "@/lib/onboarding-agent";
import { synthesizeVoice, toBrandVoice } from "@/lib/voice-synthesis";
import type { OnboardingAnswers } from "@/lib/brand-book-schema";

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-book/generate
//
//  Server-side endpoint that runs the brand-book generator with
//  optional Claude-synthesized voice. Falls back to deterministic
//  voice (existing `buildVoice()` inside the generator) if the
//  Claude call fails for any reason — so onboarding never bricks.
//
//  Auth: gated by proxy.ts (no explicit auth check here). Per-IP
//  rate-limited to prevent abuse since this hits Claude.
//
//  Body shape:
//    { userId: string, answers: OnboardingAnswers }
//
//  Response shape:
//    { brandBook: BrandBook, voice: "synthesized" | "fallback" }
// ─────────────────────────────────────────────────────────────

interface RequestBody {
  userId?: unknown;
  answers?: unknown;
}

function isPlausibleAnswers(v: unknown): v is OnboardingAnswers {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.location === "string" &&
    Array.isArray(o.markets) &&
    typeof o.targetClient === "string" &&
    Array.isArray(o.personalityTraits) &&
    typeof o.tonePreference === "string" &&
    Array.isArray(o.contentFocus)
  );
}

export async function POST(req: NextRequest) {
  // Derive the user from the session — never trust a userId in the body
  // (this route spends Claude credits and writes a per-user brand book).
  let userId: string;
  try {
    const auth = await requireAuthContext();
    userId = auth.userId;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const answers = body.answers;

  // Decide whether to even attempt synthesis: only when the user actually
  // provided samples OR a mission to ground voice in. Without either,
  // the deterministic fallback is just as good and avoids a needless
  // API call + ~2s latency.
  const hasSynthesisSignal =
    (Array.isArray(answers.voiceSamples) && answers.voiceSamples.length > 0) ||
    (typeof answers.mission === "string" && answers.mission.trim().length > 0);

  let voiceSource: "synthesized" | "fallback" = "fallback";

  if (hasSynthesisSignal) {
    try {
      const synth = await synthesizeVoice({
        industry: answers.industry,
        profession: answers.profession,
        mission: answers.mission,
        personalityTraits: answers.personalityTraits,
        tonePreference: answers.tonePreference,
        targetClient: answers.targetClient,
        voiceSamples: answers.voiceSamples ?? [],
        antiVoice: answers.antiVoice,
      });
      const brandBook = generateBrandBook(userId, answers, {
        voice: toBrandVoice(synth),
      });
      voiceSource = "synthesized";
      return NextResponse.json({ brandBook, voice: voiceSource });
    } catch (err) {
      // Synthesis failed (missing key, API error, invalid JSON, schema mismatch).
      // Log and fall through to deterministic generation.
      // eslint-disable-next-line no-console
      console.warn(
        "[brand-book/generate] voice synthesis failed, falling back:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const brandBook = generateBrandBook(userId, answers);
  return NextResponse.json({ brandBook, voice: voiceSource });
}
