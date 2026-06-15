import type { ZeroShotExtraction } from "@/lib/zero-shot-extraction";

// ─────────────────────────────────────────────────────────────
//  Brand DNA — voice calibration (prompt + parsing helpers, pure)
//
//  Powers the onboarding calibration loop: the assistant generates sample
//  captions in the user's extracted voice so they can tap ✓/✗ ("does this sound
//  like me?"). Pure helpers here; the route wraps them with auth + a paid cap.
// ─────────────────────────────────────────────────────────────

export const CALIBRATION_DEFAULT_COUNT = 5;
export const CALIBRATION_MAX_COUNT = 8;

/** Build the system prompt that makes the model write in the user's voice. */
export function buildCalibrationPrompt(voice: ZeroShotExtraction, count: number): string {
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- (none given)");
  return `You write social captions in EXACTLY one small business's brand voice. Match it precisely — these are calibration samples the owner will approve or reject.

## Their voice
Tone: ${voice.tone}
Content pillars: ${voice.pillars.join(", ")}

Phrases / words they USE:
${list(voice.weSay)}

Phrases / tones they NEVER use:
${list(voice.weDontSay)}

## Task
Write ${count} short sample captions, each about a DIFFERENT everyday moment for this kind of business. They must sound exactly like the owner — same tone, rhythm, and vocabulary. Vary the length. Use the "we say" phrasing naturally; never use the "we don't say" tones. No hashtags unless they'd genuinely use them.

Respond with ONLY a JSON array of strings (no prose, no code fences):
["caption one", "caption two", ...]`;
}

/** Pull a JSON array of caption strings out of a possibly-fenced/chatty reply. */
export function parseCaptionArray(text: string): string[] {
  let raw = (text ?? "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Validate the minimal voice shape the calibration prompt needs. */
export function isUsableVoice(v: unknown): v is ZeroShotExtraction {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.tone === "string" &&
    Array.isArray(o.pillars) &&
    Array.isArray(o.weSay) &&
    Array.isArray(o.weDontSay)
  );
}

/** Clamp a requested sample count into the allowed range. */
export function clampCalibrationCount(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return CALIBRATION_DEFAULT_COUNT;
  return Math.min(Math.max(Math.round(v), 1), CALIBRATION_MAX_COUNT);
}
