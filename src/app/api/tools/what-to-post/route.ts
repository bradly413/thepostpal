import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { CAPTION_ANTI_AI_TELLS, CAPTION_SOUND_HUMAN } from "@/lib/ai-caption-voice";
import { extractMessageText } from "@/lib/ai/message-text";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Public lead-magnet: /tools/what-to-post.
 * The marketing-site audit found the template version actively disproved the
 * "writes real posts in your voice" pitch (echoed inputs, mis-scheduled named
 * days). This generates the week for real — small model, tight budget, IP
 * rate-limited; the client falls back to the static templates on any failure.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimit(buildRateLimitKey("tool-wtp", req.headers), 6, 10 * 60_000))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    throw error;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  let body: { businessType?: unknown; whatsNew?: unknown; offer?: unknown; tone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const clean = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const businessType = clean(body.businessType, 80);
  const whatsNew = clean(body.whatsNew, 160);
  const offer = clean(body.offer, 160);
  const tone = ["calm", "dry", "warm", "professional"].includes(body.tone as string)
    ? (body.tone as string)
    : "calm";
  if (!businessType) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const system = `You plan one week of social posts for a small local business. Five posts, Monday–Sunday.

Return ONLY JSON (no prose, no fences):
{"summary": one calm sentence about the week, "posts":[{"day":"Monday".."Sunday","time":"HH:MM","copy":"the post text"} x5]}

Rules:
- If the owner mentions a day ("Saturday class", "Friday open house"), that post MUST be scheduled on that exact day.
- Each copy is 1–3 short sentences, specific to THIS business — never generic filler, never restating their input verbatim.
- NEVER invent proper nouns (brewery/band/street/product names) the owner didn't give you — keep details real but unnamed ("a new pilsner on tap", not a made-up brand).
- Tone: ${tone}. Sound like the owner typing, not a brand.
${CAPTION_SOUND_HUMAN}
${CAPTION_ANTI_AI_TELLS}`;

  const user = `Business: ${businessType}
New this week: ${whatsNew || "(nothing specific)"}
Offer or event: ${offer || "(none)"}`;

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({
      model: "claude-sonnet-5",
      // Structured/routing call — reasoning would only add latency + budget risk.
      thinking: { type: "disabled" }, // same model id the rest of the app uses — the prod key rejected the Haiku id
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = extractMessageText(resp.content);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "unavailable" }, { status: 502 });
    const parsed = JSON.parse(match[0]) as {
      summary?: unknown;
      posts?: { day?: unknown; time?: unknown; copy?: unknown }[];
    };
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const posts = Array.isArray(parsed.posts)
      ? parsed.posts
          .filter(
            (p) =>
              typeof p?.copy === "string" &&
              p.copy.trim() &&
              DAYS.includes(p?.day as string),
          )
          .slice(0, 5)
          .map((p) => ({
            day: p.day as string,
            time: typeof p.time === "string" && /^\d{1,2}:\d{2}$/.test(p.time) ? p.time : "10:00",
            copy: (p.copy as string).trim().slice(0, 400),
          }))
      : [];
    if (posts.length < 3) return NextResponse.json({ error: "unavailable" }, { status: 502 });
    return NextResponse.json({
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim().slice(0, 200)
          : "Your week, drafted.",
      posts,
    });
  } catch (err) {
    console.error("[api/tools/what-to-post]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
