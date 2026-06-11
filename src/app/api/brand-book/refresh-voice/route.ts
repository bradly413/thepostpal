import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { synthesizeVoice, toBrandVoice } from "@/lib/voice-synthesis";
import type { BrandVoice } from "@/lib/brand-book-schema";

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-book/refresh-voice
//
//  Lightweight counterpart to /api/brand-book/generate. Takes the
//  voice-relevant subset of OnboardingAnswers plus a fresh set of
//  voiceSamples (typically harvested from Meta via
//  /api/meta/voice-samples) and returns ONLY the synthesized
//  BrandVoice. The client patches `brandBook.voice` in localStorage
//  rather than regenerating the whole book — preserves palette,
//  typography, post templates, pillars, photography, etc.
//
//  Body:
//    {
//      industry?: string,        // IndustryId or free text
//      profession?: string,
//      mission?: string,
//      personalityTraits: string[],
//      tonePreference: "warm" | "professional" | "playful" | "authoritative",
//      targetClient: string,
//      voiceSamples: string[],   // required; ≥1 sample of ≥40 chars
//      antiVoice?: string[]
//    }
//
//  Response:
//    {
//      voice: BrandVoice,        // patch into brandBook.voice
//      source: "synthesized" | "fallback",
//      sampleCount: number
//    }
// ─────────────────────────────────────────────────────────────

interface RequestBody {
  industry?: unknown;
  profession?: unknown;
  mission?: unknown;
  personalityTraits?: unknown;
  tonePreference?: unknown;
  targetClient?: unknown;
  voiceSamples?: unknown;
  antiVoice?: unknown;
}

const VOICE_SAMPLE_MIN_CHARS = 40;

const VALID_TONES = [
  "warm",
  "professional",
  "playful",
  "authoritative",
] as const;
type Tone = (typeof VALID_TONES)[number];

function isTone(v: unknown): v is Tone {
  return typeof v === "string" && (VALID_TONES as readonly string[]).includes(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimit(buildRateLimitKey("brand-book-refresh-voice", req.headers), 6, 60_000))) {
      return NextResponse.json(
        { error: "Too many voice refreshes. Wait a moment and retry." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const personalityTraits = asStringArray(body.personalityTraits);
  const voiceSamplesRaw = asStringArray(body.voiceSamples);
  const voiceSamples = voiceSamplesRaw
    .map((s) => s.trim())
    .filter((s) => s.length >= VOICE_SAMPLE_MIN_CHARS);

  const tonePreference = isTone(body.tonePreference) ? body.tonePreference : "warm";
  const targetClient =
    typeof body.targetClient === "string" && body.targetClient.trim()
      ? body.targetClient.trim()
      : "Local customers";
  const industry =
    typeof body.industry === "string" ? body.industry.trim() : undefined;
  const profession =
    typeof body.profession === "string" ? body.profession.trim() : undefined;
  const mission =
    typeof body.mission === "string" && body.mission.trim()
      ? body.mission.trim()
      : undefined;
  const antiVoice = asStringArray(body.antiVoice);

  if (voiceSamples.length === 0 && !mission) {
    return NextResponse.json(
      {
        error: `Need at least one voice sample of ${VOICE_SAMPLE_MIN_CHARS}+ characters, or a mission statement, to refresh voice.`,
      },
      { status: 400 },
    );
  }

  // Synthesis attempt with full Claude fidelity. On any failure (missing
  // API key, upstream error, schema mismatch) the client gets a 502 plus
  // a hint — we don't auto-fall back here because the caller specifically
  // asked to *refresh* the voice. A silent fallback would be misleading.
  try {
    const synth = await synthesizeVoice({
      industry,
      profession,
      mission,
      personalityTraits,
      tonePreference,
      targetClient,
      voiceSamples,
      antiVoice: antiVoice.length > 0 ? antiVoice : undefined,
    });
    const voice: BrandVoice = toBrandVoice(synth);
    return NextResponse.json({
      voice,
      source: "synthesized" as const,
      sampleCount: voiceSamples.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Voice refresh failed: ${msg}`,
        source: "error" as const,
        sampleCount: voiceSamples.length,
      },
      { status: 502 },
    );
  }
}
