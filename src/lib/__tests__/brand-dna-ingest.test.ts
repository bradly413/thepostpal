import { describe, expect, it } from "vitest";
import {
  INGEST_LIMITS,
  sanitizeCaptions,
  isAnalyzableImageType,
} from "@/lib/brand-dna/ingest";

describe("sanitizeCaptions", () => {
  it("accepts a real array", () => {
    expect(sanitizeCaptions(["  hello  ", "world", "  "])).toEqual(["hello", "world"]);
  });

  it("parses a JSON-stringified array", () => {
    expect(sanitizeCaptions('["one", "two"]')).toEqual(["one", "two"]);
  });

  it("falls back to newline-delimited for plain strings", () => {
    expect(sanitizeCaptions("first line\n\nsecond line")).toEqual(["first line", "second line"]);
  });

  it("drops non-strings and empties", () => {
    expect(sanitizeCaptions(["ok", 5, null, "", "  "])).toEqual(["ok"]);
  });

  it("caps the count and per-caption length", () => {
    const many = Array.from({ length: 100 }, (_, i) => `caption ${i}`);
    expect(sanitizeCaptions(many)).toHaveLength(INGEST_LIMITS.maxCaptions);

    const long = "x".repeat(INGEST_LIMITS.maxCaptionLength + 500);
    expect(sanitizeCaptions([long])[0].length).toBe(INGEST_LIMITS.maxCaptionLength);
  });

  it("returns [] for unusable input", () => {
    expect(sanitizeCaptions(null)).toEqual([]);
    expect(sanitizeCaptions(42)).toEqual([]);
    expect(sanitizeCaptions({})).toEqual([]);
  });
});

describe("isAnalyzableImageType", () => {
  it("accepts common image types", () => {
    for (const t of ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"]) {
      expect(isAnalyzableImageType(t)).toBe(true);
    }
  });

  it("rejects non-images and junk", () => {
    expect(isAnalyzableImageType("application/pdf")).toBe(false);
    expect(isAnalyzableImageType("text/plain")).toBe(false);
    expect(isAnalyzableImageType("")).toBe(false);
    expect(isAnalyzableImageType(undefined)).toBe(false);
    expect(isAnalyzableImageType(null)).toBe(false);
  });
});
