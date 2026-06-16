// Style Critic — deterministic "does this read as AI?" scorer + candidate ranker.
//
// The moat isn't generating text; it's TASTE — generating several candidates and
// keeping the one a real person would actually post. This is the selection half.
// It is fully deterministic (no model call, no per-tenant profile required), so
// it's cheap enough to run on every candidate and reusable everywhere generation
// happens (content plan, studio captions, a "sounds like you" badge).
//
// It scores AI-slop tells, not correctness. Lower aiNess = more human.

export interface StyleTell {
  /** Short label for the pattern that fired. */
  name: string;
  /** The offending snippet (for explainability / a future "why" UI). */
  snippet: string;
  weight: number;
}

export interface StyleVerdict {
  /** 0 (reads human) … 1 (reads like generic AI). */
  aiNess: number;
  /** Convenience inverse — the "sounds human" score for a badge. */
  humanity: number;
  tells: StyleTell[];
}

// ── Lexical tells — phrases and constructions that scream LLM ──────────────────
// Grouped by weight: a few of these is fine, a pileup is the tell.
const PHRASE_TELLS: { re: RegExp; name: string; weight: number }[] = [
  // Opener clichés
  { re: /\b(in (?:a|our|today's)[^.,]{0,24}\b(?:world|age|landscape|era))\b/i, name: "in-a-world opener", weight: 3 },
  { re: /\b(let's face it|we've all been there|picture this|imagine (?:this|a)|here's the thing|truth be told)\b/i, name: "faux-relatable opener", weight: 2.5 },
  // The "not just X, it's Y" / antithesis construction
  { re: /\bnot just (?:a |an |another )?[^.,]{2,30},?\s*(?:it's|but)\b/i, name: "'not just X, it's Y'", weight: 3 },
  { re: /\bit's not (?:about|just)[^.]{2,40},?\s*it's\b/i, name: "'it's not X, it's Y'", weight: 3 },
  { re: /\bisn't just (?:a|an|about)\b/i, name: "'isn't just a'", weight: 2.5 },
  // Hype verbs / marketing-AI vocabulary
  { re: /\b(elevate|unlock|unleash|supercharge|revolutioniz|transform your|level up|game[- ]?changer|next[- ]level|harness|embark|dive in|delve|skyrocket|turbocharge)\b/i, name: "hype verb", weight: 2.5 },
  { re: /\b(your go-to|look no further|say goodbye to|the secret to|stay tuned|without further ado|buckle up)\b/i, name: "infomercial phrase", weight: 2.5 },
  { re: /\bwhether you're[^.]{3,40}\bor\b/i, name: "'whether you're X or Y'", weight: 2 },
  { re: /\bthat's where (?:we|[a-z]+) come(?:s)? in\b/i, name: "'that's where we come in'", weight: 2.5 },
  { re: /\bmore than just\b/i, name: "'more than just'", weight: 2 },
  // Empty intensifiers (overused by models)
  { re: /\b(truly|simply|effortlessly|seamlessly|absolutely|undeniably|incredibly)\b/gi, name: "empty intensifier", weight: 1 },
  // Faux-casual LLM closers
  { re: /\b(and honestly\?|trust me,|you (?:won't|wont) regret it|need we say more)\b/i, name: "faux-casual closer", weight: 2 },
  { re: /^\s*(?:so,?\s*)?(?:ready to|want to)\b[^.?!]{3,60}\?\s*$/im, name: "canned CTA question line", weight: 1.5 },
  // Hashtag-as-sentence / generic boosters
  { re: /#(?:smallbusiness|supportlocal|shoplocal|community|qualityyoucantrust|excellence)\b/i, name: "generic booster hashtag", weight: 1.5 },
];

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function sentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Score how much a caption reads like generic AI. Deterministic and cheap.
 * Returns aiNess in [0,1] plus the specific tells that fired.
 */
export function scoreAiNess(textRaw: string): StyleVerdict {
  const text = (textRaw || "").trim();
  if (!text) return { aiNess: 1, humanity: 0, tells: [{ name: "empty", snippet: "", weight: 10 }] };

  const tells: StyleTell[] = [];
  let weight = 0;

  // 1. Lexical phrase tells.
  for (const t of PHRASE_TELLS) {
    const m = text.match(t.re);
    if (m) {
      tells.push({ name: t.name, snippet: m[0].slice(0, 48), weight: t.weight });
      weight += t.weight;
    }
  }

  // 2. Structural tells.
  const sents = sentences(text);
  const words = text.split(/\s+/).filter(Boolean);

  // Em-dash abuse — the single most reliable LLM fingerprint.
  const emDashes = (text.match(/—|\s-\s/g) || []).length;
  if (emDashes >= 2 || (emDashes >= 1 && sents.length <= 2)) {
    tells.push({ name: "em-dash habit", snippet: `${emDashes} dashes`, weight: 2 });
    weight += 2;
  }

  // Rule-of-three: "X, Y, and Z" adjective/verb triads.
  if (/\b\w+,\s+\w+,\s+(?:and|&)\s+\w+\b/.test(text)) {
    tells.push({ name: "rule-of-three triad", snippet: "x, y, and z", weight: 1.5 });
    weight += 1.5;
  }

  // Emoji pile-up.
  const emoji = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (emoji >= 4) {
    tells.push({ name: "emoji pile-up", snippet: `${emoji} emoji`, weight: 1.5 });
    weight += 1.5;
  }

  // Hashtag stuffing (FB/IG: 0–3 is the 2026 reality).
  const tags = (text.match(/#\w+/g) || []).length;
  if (tags > 4) {
    tells.push({ name: "hashtag stuffing", snippet: `${tags} hashtags`, weight: 1.5 });
    weight += 1.5;
  }

  // Robotic rhythm: 3+ sentences all within a tight length band reads synthetic;
  // humans vary (a fragment, then a long one). Reward variance, penalize sameness.
  if (sents.length >= 3) {
    const lens = sents.map((s) => s.split(/\s+/).length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // coefficient of variation
    if (cv < 0.22 && mean > 6) {
      tells.push({ name: "uniform sentence rhythm", snippet: `cv=${cv.toFixed(2)}`, weight: 1.5 });
      weight += 1.5;
    }
  }

  // Title-Casing Every Word Like A Headline.
  if (/(?:\b[A-Z][a-z]+\b\s+){4,}/.test(text) && words.length < 40) {
    tells.push({ name: "headline title-casing", snippet: "Title Case Run", weight: 1 });
    weight += 1;
  }

  // Saturating map: a single minor tell barely moves; a pileup approaches 1.
  const aiNess = clamp01(1 - Math.exp(-weight / 5));
  return { aiNess, humanity: clamp01(1 - aiNess), tells };
}

export interface RankedCandidate<T> {
  candidate: T;
  text: string;
  verdict: StyleVerdict;
}

/**
 * Rank caption candidates most-human first. `getText` extracts the scorable
 * caption from each candidate (defaults to identity for string candidates).
 * Tie-break toward the shorter candidate (tighter usually reads more human).
 */
export function rankByHumanity<T>(
  candidates: T[],
  getText: (c: T) => string = (c) => String(c),
): RankedCandidate<T>[] {
  return candidates
    .map((candidate) => {
      const text = getText(candidate);
      return { candidate, text, verdict: scoreAiNess(text) };
    })
    .sort((a, b) => a.verdict.aiNess - b.verdict.aiNess || a.text.length - b.text.length);
}

/** The most-human candidate, or null if none. */
export function pickMostHuman<T>(
  candidates: T[],
  getText: (c: T) => string = (c) => String(c),
): RankedCandidate<T> | null {
  return rankByHumanity(candidates, getText)[0] ?? null;
}
