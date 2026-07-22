import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@/lib/ai/anthropic";
import {
  analyzeHistorySignals,
  type HistoryPost,
} from "@/lib/social-history-signals";
import {
  ZERO_SHOT_EXTRACTION_PROMPT,
  zeroShotExtractionSchema,
  type ZeroShotExtraction,
  type ZeroShotHistoryResult,
} from "@/lib/zero-shot-extraction";
import {
  rateLimit,
  buildRateLimitKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";

const MAX_CHARS = 12_000;
const MIN_CHARS = 80;

/**
 * Split pasted social copy into caption-like posts.
 * Prefer blank-line blocks; fall back to longer single lines.
 */
export function splitPastedCaptions(text: string): HistoryPost[] {
  const raw = text.trim().slice(0, MAX_CHARS);
  if (!raw) return [];

  let blocks = raw
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);

  if (blocks.length < 2) {
    blocks = raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 24);
  }

  if (blocks.length === 0 && raw.length >= MIN_CHARS) {
    blocks = [raw];
  }

  return blocks.slice(0, 40).map((caption, i) => ({
    id: `paste-${i + 1}`,
    provider: "paste",
    caption,
  }));
}

async function synthesizeVoiceFromPosts(
  posts: HistoryPost[],
  signalsSummary: { hashtags: string[]; cadence: string; mediaMix: string },
): Promise<ZeroShotExtraction> {
  const dataset = JSON.stringify(
    posts.slice(0, 40).map((p) => ({
      caption: p.caption,
      mediaType: null,
      createdAt: null,
      provider: p.provider,
    })),
  );

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: zeroShotExtractionSchema,
    system: ZERO_SHOT_EXTRACTION_PROMPT,
    prompt: `Precomputed local stats (trust these; do not invent alternatives):
- Top hashtags: ${signalsSummary.hashtags.length ? signalsSummary.hashtags.join(", ") : "(none found)"}
- Posting cadence: ${signalsSummary.cadence}
- Media mix: ${signalsSummary.mediaMix}

The user pasted these captions / posts (not API-fetched). Treat them as their real voice samples:
${dataset}`,
  });
  return object;
}

/**
 * POST /api/onboarding/analyze-paste
 * Body: { text: string }
 *
 * In-page scan — no OAuth. Turns pasted captions into the same voice result
 * shape as analyze-history so onboarding can merge them.
 */
export async function POST(req: Request) {
  try {
    // Public AI endpoint — match what-to-post (6 / 10 min per IP).
    try {
      if (!(await rateLimit(buildRateLimitKey("onboarding-analyze-paste", req.headers), 6, 10 * 60_000))) {
        return NextResponse.json(
          { analyzed: false, error: "Too many scans. Wait a few minutes and try again." },
          { status: 429 },
        );
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json(
          { analyzed: false, error: "Voice scan isn’t available right now." },
          { status: 503 },
        );
      }
      throw error;
    }

    const body = (await req.json()) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (text.length < MIN_CHARS) {
      return NextResponse.json(
        {
          analyzed: false,
          error: "Paste a few real captions (at least a short paragraph or two).",
        },
        { status: 400 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return NextResponse.json(
        { analyzed: false, error: "Voice scan isn’t configured right now." },
        { status: 503 },
      );
    }

    const posts = splitPastedCaptions(text);
    if (posts.length === 0) {
      return NextResponse.json(
        { analyzed: false, error: "Couldn’t read any captions from that paste." },
        { status: 400 },
      );
    }

    const signals = analyzeHistorySignals(posts);
    const voiceCore = await synthesizeVoiceFromPosts(posts, {
      hashtags: signals.topHashtags.map((h) => h.tag),
      cadence: signals.cadence.summary,
      mediaMix: "Pasted captions (media mix unknown)",
    });

    const voice: ZeroShotHistoryResult = {
      ...voiceCore,
      hashtags: signals.topHashtags.map((h) => h.tag),
      postingCadence: signals.cadence.summary || "From pasted samples",
      mediaMix: "Pasted captions",
    };

    return NextResponse.json({
      analyzed: true,
      voice,
      postCount: posts.length,
    });
  } catch (error) {
    console.error("api.onboarding.analyze-paste.POST", error);
    return NextResponse.json(
      { analyzed: false, error: "Couldn’t scan that paste. Try again or continue without it." },
      { status: 500 },
    );
  }
}
