import { describe, expect, it } from "vitest";
import {
  enrichIntentWithFormat,
  makeWorkingAssistant,
  platformIdxForAspect,
} from "./studio-chat";

const PLATFORMS = [
  { id: "instagram", genAspect: "4:5" },
  { id: "facebook", genAspect: "4:5" },
  { id: "x", genAspect: "16:9" },
  { id: "linkedin", genAspect: "16:9" },
  { id: "tiktok", genAspect: "9:16" },
] as const;

describe("enrichIntentWithFormat", () => {
  it("leaves single format unchanged", () => {
    expect(enrichIntentWithFormat("make a post about coffee", "single", 3)).toBe(
      "make a post about coffee",
    );
  });

  it("appends slide-1-of-N carousel note", () => {
    const out = enrichIntentWithFormat("spring menu launch", "carousel", 4);
    expect(out).toContain("spring menu launch");
    expect(out).toContain("slide 1 of 4");
    expect(out).toContain("carousel");
  });

  it("clamps carousel count to 2–5", () => {
    expect(enrichIntentWithFormat("promo", "carousel", 99)).toContain("slide 1 of 5");
    expect(enrichIntentWithFormat("promo", "carousel", 1)).toContain("slide 1 of 2");
  });
});

describe("makeWorkingAssistant", () => {
  it("starts with an honest preparation status", () => {
    expect(makeWorkingAssistant({ format: "single" })).toMatchObject({
      role: "assistant",
      status: "working",
      text: "Preparing your image…",
    });
  });
});

describe("platformIdxForAspect", () => {
  it("maps aspect overrides to platform preview indices", () => {
    expect(platformIdxForAspect("9:16", PLATFORMS)).toBe(4);
    expect(platformIdxForAspect("16:9", PLATFORMS)).toBe(3);
    expect(platformIdxForAspect("4:5", PLATFORMS)).toBe(0);
    expect(platformIdxForAspect("1:1", PLATFORMS)).toBe(0);
  });
});
