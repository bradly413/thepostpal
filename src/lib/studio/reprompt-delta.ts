/** Client-safe heuristics for “edit the last image” vs a fresh brief. */

const EDIT_PREFIX_RE =
  /^(make it|more |less |warmer|brighter|lighter|darker|vivid|colorful|wider|closer|closeup|close-up|tighter|same |change |try |add |remove |fix |keep |swap |zoom|crop|adjust|level camera|straight horizon)/i;

/** Edit language anywhere in the request — not only at the start. */
const EDIT_INLINE_RE =
  /\b(brighter|lighter|darker|warmer|cooler|closer|closeup|close-up|close up|wider|zoom in|zoom out|crop|more vivid|more natural|less clutter|same subject|keep the|the same|more turquoise|level horizon|straight horizon)\b/i;

/** References the existing subject ("the cupcake", "of the palm tree"). */
const SUBJECT_ANCHOR_RE = /\b(the|this|same)\s+\w+/i;

/** Reads like a new subject/post, not a tweak of the last image. */
const NEW_BRIEF_RE =
  /^(a |an |make a |make an |create |post about|instagram|facebook|tiktok|linkedin|twitter|generate |show )/i;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "on",
  "at",
  "in",
  "our",
  "my",
  "make",
  "post",
  "about",
  "for",
  "with",
  "and",
  "or",
]);

function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

/** 0–1 overlap of meaningful words between two briefs. */
function wordOverlapRatio(a: string, b: string): number {
  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) {
    if (wb.has(w)) shared++;
  }
  return shared / Math.min(wa.size, wb.size);
}

export function isEditOnlyRequest(intent: string): boolean {
  const t = intent.trim();
  if (!t) return false;
  return EDIT_PREFIX_RE.test(t) || EDIT_INLINE_RE.test(t);
}

/** Whole new subject while an image is on canvas (e.g. "a burger" after a cupcake). */
export function isClearlyNewSubject(intent: string): boolean {
  const t = intent.trim();
  if (!t) return false;
  if (isEditOnlyRequest(t)) return false;
  if (NEW_BRIEF_RE.test(t)) return true;
  return t.split(/\s+/).length <= 8 && !SUBJECT_ANCHOR_RE.test(t);
}

export function isRepromptDelta(intent: string, previousPrompt: string | null | undefined): boolean {
  const delta = intent.trim();
  const prev = (previousPrompt || "").trim();
  if (!delta || !prev) return false;
  if (delta === prev) return false;

  if (EDIT_PREFIX_RE.test(delta)) return true;
  if (EDIT_INLINE_RE.test(delta)) return true;
  if (SUBJECT_ANCHOR_RE.test(delta) && EDIT_INLINE_RE.test(delta)) return true;

  const overlap = wordOverlapRatio(delta, prev);

  // Clearly a new subject — generate from scratch (e.g. "a palm tree" → "a burger").
  if (NEW_BRIEF_RE.test(delta) && overlap < 0.5 && !EDIT_INLINE_RE.test(delta)) return false;
  if (overlap < 0.2 && delta.length >= prev.length * 0.5 && !EDIT_INLINE_RE.test(delta)) return false;

  // Same topic, expanded or nudged — edit the existing image.
  if (overlap >= 0.4) return true;

  // Short tweak on a related brief ("on the beach", "more turquoise").
  if (delta.length <= 60 && overlap >= 0.2) return true;

  return false;
}

/**
 * User is tweaking the image currently on the canvas — use vision + reference,
 * never a fresh compose that can swap the subject.
 */
export function shouldEditFromReference(
  intent: string,
  previousPrompt: string | null | undefined,
  hasGeneratedImage: boolean,
): boolean {
  if (!hasGeneratedImage) return false;
  const delta = intent.trim();
  if (!delta) return false;
  if (isClearlyNewSubject(delta)) return false;
  if (isRepromptDelta(delta, previousPrompt)) return true;
  // Lost prompt anchor (history pick, reload) — edit phrases still mean "edit this image".
  if (isEditOnlyRequest(delta)) return true;
  return false;
}

/** When /api/studio/reprompt fails — still anchor Gemini to the reference image. */
export function buildFallbackEditPrompt(delta: string): string {
  return `Edit the reference photograph. Keep the exact same main subject, food item, and scene identity visible in the reference — do not replace it with a different pastry, object, or subject. Apply only these changes: ${delta.trim()}. Brighter exposure and closer crop if requested. Photographic, vivid, no text or watermark.`;
}
