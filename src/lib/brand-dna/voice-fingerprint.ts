// ─────────────────────────────────────────────────────────────
//  Brand DNA — voice fingerprint (deterministic, model-free)
//
//  Extracts measurable stylistic features from a user's real captions so we can
//  (a) seed their Brand DNA from how they ACTUALLY write, and (b) score future
//  generated copy for "does this sound like them?" — a fidelity gate that stacks
//  on top of the compliance guardrails.
//
//  Pure + deterministic on purpose: no AI call, no network, fully unit-testable,
//  and free to run on every caption. The model handles semantics (tone, pillars);
//  this handles the quantifiable surface that makes a voice recognizable.
// ─────────────────────────────────────────────────────────────

export interface CaptionMetrics {
  words: number;
  sentences: number;
  avgSentenceLength: number; // words per sentence
  emojis: number;
  emojiPer100Words: number;
  hashtags: number;
  mentions: number;
  exclamations: number;
  questions: number;
  uppercaseWordRatio: number; // ALLCAPS words / words (>=2 letters)
  lexicalDiversity: number; // unique content words / content words (TTR)
}

export interface VoiceFingerprint {
  sampleCount: number;
  avgWordsPerCaption: number;
  avgSentenceLength: number;
  emojiPer100Words: number;
  avgEmojisPerCaption: number;
  hashtagsPerCaption: number;
  mentionsPerCaption: number;
  exclamationsPerCaption: number;
  questionsPerCaption: number;
  uppercaseWordRatio: number;
  lexicalDiversity: number;
  /** Most frequent meaningful tokens across the corpus (signature vocabulary). */
  topTokens: string[];
}

// Extended_Pictographic covers the emoji we care about without matching plain
// digits/symbols. Global + unicode flags.
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
// Case-preserving word matcher (used for ALLCAPS detection + counts).
const WORD_RE = /[A-Za-z0-9']+/g;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "with",
  "at", "by", "from", "up", "out", "as", "is", "are", "was", "were", "be", "been",
  "being", "this", "that", "these", "those", "it", "its", "i", "you", "we", "us",
  "our", "your", "my", "me", "they", "them", "their", "he", "she", "his", "her",
  "so", "if", "then", "than", "too", "very", "just", "do", "does", "did", "have",
  "has", "had", "will", "would", "can", "could", "should", "not", "no", "yes",
  "all", "any", "some", "more", "most", "get", "got", "im", "ill", "ive",
]);

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** Case-preserving word list. */
function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

/** Per-caption surface metrics. Safe on empty/whitespace input (returns zeros). */
export function computeCaptionMetrics(text: string): CaptionMetrics {
  const trimmed = (text ?? "").trim();
  const raw = words(trimmed); // case preserved
  const wordCount = raw.length;

  // A caption with words but no terminal punctuation still counts as 1 sentence.
  const terminators = countMatches(trimmed, /[.!?]+/g);
  const sentences = wordCount === 0 ? 0 : Math.max(1, terminators);

  const emojis = countMatches(trimmed, EMOJI_RE);
  const hashtags = countMatches(trimmed, /(?:^|\s)#[A-Za-z0-9_]+/g);
  const mentions = countMatches(trimmed, /(?:^|\s)@[A-Za-z0-9_.]+/g);
  const exclamations = countMatches(trimmed, /!/g);
  const questions = countMatches(trimmed, /\?/g);

  // ALLCAPS = a 2+ char word containing a letter, equal to its uppercased form.
  const uppercaseWords = raw.filter(
    (w) => w.length >= 2 && /[A-Za-z]/.test(w) && w === w.toUpperCase(),
  ).length;

  const contentWords = raw
    .map((w) => w.toLowerCase())
    .filter((w) => !STOPWORDS.has(w));
  const uniqueContent = new Set(contentWords).size;

  return {
    words: wordCount,
    sentences,
    avgSentenceLength: sentences === 0 ? 0 : round(wordCount / sentences),
    emojis,
    emojiPer100Words: wordCount === 0 ? 0 : round((emojis / wordCount) * 100),
    hashtags,
    mentions,
    exclamations,
    questions,
    uppercaseWordRatio: wordCount === 0 ? 0 : round(uppercaseWords / wordCount),
    lexicalDiversity: contentWords.length === 0 ? 0 : round(uniqueContent / contentWords.length),
  };
}

/** Aggregate a corpus of captions into a stable voice fingerprint. */
export function computeVoiceFingerprint(captions: string[]): VoiceFingerprint {
  const real = (captions ?? []).map((c) => (c ?? "").trim()).filter(Boolean);
  const n = real.length;

  if (n === 0) {
    return {
      sampleCount: 0,
      avgWordsPerCaption: 0,
      avgSentenceLength: 0,
      emojiPer100Words: 0,
      avgEmojisPerCaption: 0,
      hashtagsPerCaption: 0,
      mentionsPerCaption: 0,
      exclamationsPerCaption: 0,
      questionsPerCaption: 0,
      uppercaseWordRatio: 0,
      lexicalDiversity: 0,
      topTokens: [],
    };
  }

  const metrics = real.map(computeCaptionMetrics);
  const totalWords = sum(metrics.map((m) => m.words));
  const totalEmojis = sum(metrics.map((m) => m.emojis));

  // Corpus-wide top tokens (signature vocabulary).
  const freq = new Map<string, number>();
  for (const c of real) {
    for (const w of words(c)) {
      const lw = w.toLowerCase();
      if (lw.length < 3 || STOPWORDS.has(lw)) continue;
      freq.set(lw, (freq.get(lw) ?? 0) + 1);
    }
  }
  const topTokens = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([w]) => w);

  return {
    sampleCount: n,
    avgWordsPerCaption: round(totalWords / n),
    avgSentenceLength: round(avg(metrics.map((m) => m.avgSentenceLength))),
    emojiPer100Words: totalWords === 0 ? 0 : round((totalEmojis / totalWords) * 100),
    avgEmojisPerCaption: round(totalEmojis / n),
    hashtagsPerCaption: round(avg(metrics.map((m) => m.hashtags))),
    mentionsPerCaption: round(avg(metrics.map((m) => m.mentions))),
    exclamationsPerCaption: round(avg(metrics.map((m) => m.exclamations))),
    questionsPerCaption: round(avg(metrics.map((m) => m.questions))),
    uppercaseWordRatio: round(avg(metrics.map((m) => m.uppercaseWordRatio))),
    lexicalDiversity: round(avg(metrics.map((m) => m.lexicalDiversity))),
    topTokens,
  };
}

export interface FidelityResult {
  /** 0..1 — how closely the text matches the fingerprint's measurable style. */
  score: number;
  /** Per-feature similarity (0..1) for explainability. */
  features: Record<string, number>;
}

// Tolerance scales: the absolute difference at which a feature's similarity hits 0.
const SCALES = {
  words: 40, // words per caption
  sentenceLength: 12, // words per sentence
  emoji: 8, // emojis per 100 words
  hashtags: 6,
  exclamations: 3,
  uppercase: 0.25,
  diversity: 0.5,
} as const;

function featureSimilarity(a: number, b: number, scale: number): number {
  return clamp01(1 - Math.abs(a - b) / scale);
}

/**
 * Score how closely a single piece of text matches a voice fingerprint.
 * Deterministic; intended as a fidelity gate before publishing AI-generated copy
 * (regenerate / flag when the score drops below a product-chosen threshold).
 */
export function scoreVoiceFidelity(text: string, fp: VoiceFingerprint): FidelityResult {
  const m = computeCaptionMetrics(text);
  const features: Record<string, number> = {
    length: featureSimilarity(m.words, fp.avgWordsPerCaption, SCALES.words),
    sentenceLength: featureSimilarity(m.avgSentenceLength, fp.avgSentenceLength, SCALES.sentenceLength),
    emoji: featureSimilarity(m.emojiPer100Words, fp.emojiPer100Words, SCALES.emoji),
    hashtags: featureSimilarity(m.hashtags, fp.hashtagsPerCaption, SCALES.hashtags),
    exclamations: featureSimilarity(m.exclamations, fp.exclamationsPerCaption, SCALES.exclamations),
    uppercase: featureSimilarity(m.uppercaseWordRatio, fp.uppercaseWordRatio, SCALES.uppercase),
    diversity: featureSimilarity(m.lexicalDiversity, fp.lexicalDiversity, SCALES.diversity),
  };
  const vals = Object.values(features);
  return { score: round(avg(vals)), features };
}

// ── small numeric helpers ────────────────────────────────────
function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : sum(xs) / xs.length;
}
function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
