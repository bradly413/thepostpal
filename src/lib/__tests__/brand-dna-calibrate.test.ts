import { describe, expect, it } from "vitest";
import {
  buildCalibrationPrompt,
  parseCaptionArray,
  isUsableVoice,
  clampCalibrationCount,
  CALIBRATION_MAX_COUNT,
  CALIBRATION_DEFAULT_COUNT,
} from "@/lib/brand-dna/calibrate";

const voice = {
  tone: "Warm. Local. Honest.",
  pillars: ["food", "team"],
  weSay: ["come hungry", "made fresh"],
  weDontSay: ["world-class", "synergy"],
};

describe("buildCalibrationPrompt", () => {
  it("embeds the voice and the requested count", () => {
    const p = buildCalibrationPrompt(voice, 4);
    expect(p).toContain("Warm. Local. Honest.");
    expect(p).toContain("come hungry");
    expect(p).toContain("world-class");
    expect(p).toContain("Write 4 short sample captions");
  });

  it("handles empty phrase lists gracefully", () => {
    const p = buildCalibrationPrompt({ tone: "Bold.", pillars: [], weSay: [], weDontSay: [] }, 3);
    expect(p).toContain("(none given)");
  });
});

describe("parseCaptionArray", () => {
  it("parses a plain JSON array", () => {
    expect(parseCaptionArray('["one", "two", "three"]')).toEqual(["one", "two", "three"]);
  });
  it("parses a fenced array with surrounding chatter", () => {
    expect(parseCaptionArray('Here you go:\n```json\n["a", "b"]\n```')).toEqual(["a", "b"]);
  });
  it("trims, drops empties and non-strings", () => {
    expect(parseCaptionArray('[" a ", "", 5, "b"]')).toEqual(["a", "b"]);
  });
  it("returns [] for junk", () => {
    expect(parseCaptionArray("not json at all")).toEqual([]);
    expect(parseCaptionArray("")).toEqual([]);
  });
});

describe("isUsableVoice", () => {
  it("accepts a well-formed voice", () => {
    expect(isUsableVoice(voice)).toBe(true);
  });
  it("rejects malformed voices", () => {
    expect(isUsableVoice(null)).toBe(false);
    expect(isUsableVoice({ tone: "x" })).toBe(false);
    expect(isUsableVoice({ tone: 5, pillars: [], weSay: [], weDontSay: [] })).toBe(false);
  });
});

describe("clampCalibrationCount", () => {
  it("clamps into range and defaults on junk", () => {
    expect(clampCalibrationCount(3)).toBe(3);
    expect(clampCalibrationCount(99)).toBe(CALIBRATION_MAX_COUNT);
    expect(clampCalibrationCount(0)).toBe(1);
    expect(clampCalibrationCount("nope")).toBe(CALIBRATION_DEFAULT_COUNT);
  });
});
