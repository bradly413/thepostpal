import { describe, expect, it } from "vitest";
import {
  computeCaptionMetrics,
  computeVoiceFingerprint,
  scoreVoiceFidelity,
} from "@/lib/brand-dna/voice-fingerprint";

describe("computeCaptionMetrics", () => {
  it("computes words, sentences, and punctuation", () => {
    const m = computeCaptionMetrics("Hello world! How are you?");
    expect(m.words).toBe(5);
    expect(m.sentences).toBe(2);
    expect(m.avgSentenceLength).toBe(2.5);
    expect(m.exclamations).toBe(1);
    expect(m.questions).toBe(1);
    expect(m.emojis).toBe(0);
  });

  it("counts emojis, hashtags, and mentions", () => {
    const m = computeCaptionMetrics("love this 😍😍 @posterboy #brand #local");
    expect(m.emojis).toBe(2);
    expect(m.hashtags).toBe(2);
    expect(m.mentions).toBe(1);
  });

  it("detects ALLCAPS words (case is preserved, not lowercased away)", () => {
    const m = computeCaptionMetrics("BIG news today");
    expect(m.uppercaseWordRatio).toBeCloseTo(1 / 3, 3);
  });

  it("returns zeros for empty/whitespace input", () => {
    const m = computeCaptionMetrics("   ");
    expect(m.words).toBe(0);
    expect(m.sentences).toBe(0);
    expect(m.lexicalDiversity).toBe(0);
  });
});

describe("computeVoiceFingerprint", () => {
  it("returns an all-zero profile for an empty corpus", () => {
    const fp = computeVoiceFingerprint([]);
    expect(fp.sampleCount).toBe(0);
    expect(fp.topTokens).toEqual([]);
  });

  it("aggregates a corpus and surfaces signature vocabulary (no stopwords)", () => {
    const fp = computeVoiceFingerprint([
      "Fresh cuts every day at the shop 💈 #barber",
      "Fresh fades, fresh vibes. Come through!",
      "The shop is busy — book your fresh cut.",
    ]);
    expect(fp.sampleCount).toBe(3);
    expect(fp.avgEmojisPerCaption).toBeGreaterThan(0);
    expect(fp.topTokens).toContain("fresh"); // most frequent content word
    expect(fp.topTokens).not.toContain("the"); // stopword excluded
    expect(fp.topTokens.every((t) => t === t.toLowerCase())).toBe(true);
  });

  it("is deterministic", () => {
    const corpus = ["Quick note.", "Another QUICK one!", "third 🙂"];
    expect(computeVoiceFingerprint(corpus)).toEqual(computeVoiceFingerprint(corpus));
  });
});

describe("scoreVoiceFidelity", () => {
  const fp = computeVoiceFingerprint([
    "short and punchy.",
    "keep it short.",
    "brief lines only.",
  ]);

  it("scores an on-voice line higher than an off-voice one", () => {
    const onVoice = scoreVoiceFidelity("quick clean note.", fp).score;
    const offVoice = scoreVoiceFidelity(
      "This is an extraordinarily long, verbose, meandering sentence that drags on with far too many clauses and words to ever resemble the punchy brand voice, truly endless.",
      fp,
    ).score;
    expect(onVoice).toBeGreaterThan(offVoice);
    expect(onVoice).toBeGreaterThan(0.5);
  });

  it("returns a score in [0,1] with per-feature breakdown", () => {
    const r = scoreVoiceFidelity("hello there.", fp);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(Object.keys(r.features)).toContain("length");
    expect(Object.keys(r.features)).toContain("emoji");
  });
});
