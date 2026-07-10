import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { resolveBrandBookAuth } from "@/lib/onboarding-auth";
import {
  buildCalibrationPrompt,
  parseCaptionArray,
  isUsableVoice,
  clampCalibrationCount,
} from "@/lib/brand-dna/calibrate";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const CALIBRATE_DAILY_CAP = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-dna/calibrate
//
//  The "does this sound like you?" generator. Given the user's extracted voice,
//  writes sample captions in that voice for the onboarding calibration loop (the
//  user taps ✓/✗ on each — no typing). PAID: burst-limited + per-day capped.
//  Guest-capable so it works pre-sign-in.
//
//  Body: { voice: ZeroShotExtraction, count?: number }
//  Response: { captions: string[], authMode }
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const brandAuth = await resolveBrandBookAuth();
  const actor =
    brandAuth.mode === "session"
      ? { tenantId: brandAuth.auth.tenantId, userId: brandAuth.auth.userId }
      : null;

  try {
    if (!(await rateLimit(buildRateLimitKey("brand-dna-calibrate", req.headers, actor), 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
    if (
      !(await rateLimit(
        buildRateLimitKey("brand-dna-calibrate-day", req.headers, actor),
        CALIBRATE_DAILY_CAP,
        ONE_DAY_MS,
      ))
    ) {
      return NextResponse.json({ error: "Daily calibration limit reached. Try again tomorrow." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: { voice?: unknown; count?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isUsableVoice(body.voice)) {
    return NextResponse.json({ error: "A voice (tone, pillars, weSay, weDontSay) is required" }, { status: 400 });
  }
  const count = clampCalibrationCount(body.count);
  const system = buildCalibrationPrompt(body.voice, count);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: "Write the calibration samples now." }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const captions = parseCaptionArray(text).slice(0, count);
    if (captions.length === 0) {
      return NextResponse.json({ error: "Couldn't generate samples. Try again." }, { status: 502 });
    }
    return NextResponse.json({ captions, authMode: brandAuth.mode });
  } catch (err) {
    console.error("[api/brand-dna/calibrate] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
