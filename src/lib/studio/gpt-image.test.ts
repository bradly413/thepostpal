import { describe, expect, it } from "vitest";
import { gptImageErrorMessage, gptImageSizeForAspect } from "@/lib/studio/gpt-image";

describe("gptImageSizeForAspect", () => {
  it("maps Studio aspects to the nearest supported size", () => {
    expect(gptImageSizeForAspect("1:1")).toBe("1024x1024");
    expect(gptImageSizeForAspect("4:5")).toBe("1024x1536");
    expect(gptImageSizeForAspect("9:16")).toBe("1024x1536");
    expect(gptImageSizeForAspect("16:9")).toBe("1536x1024");
    expect(gptImageSizeForAspect(undefined)).toBe("1024x1024");
    expect(gptImageSizeForAspect("weird")).toBe("1024x1024");
  });
});

describe("gptImageErrorMessage", () => {
  it("prefers the API error message", () => {
    expect(
      gptImageErrorMessage({ error: { message: "Billing hard limit reached" } }),
    ).toBe("Billing hard limit reached");
  });
  it("falls back when the error shape is empty", () => {
    expect(gptImageErrorMessage({ error: null })).toBe("Image generation failed");
    expect(gptImageErrorMessage({}, "custom")).toBe("custom");
  });
});
