import { describe, expect, it } from "vitest";
import {
  gptOutputQualityForStudio,
  normalizeStudioImageQuality,
  studioImageQualityLabel,
} from "@/lib/studio/image-quality";

describe("Studio image quality", () => {
  it("normalizes request values without granting High implicitly", () => {
    expect(normalizeStudioImageQuality("draft")).toBe("draft");
    expect(normalizeStudioImageQuality("standard")).toBe("standard");
    expect(normalizeStudioImageQuality("pro")).toBe("pro");
    expect(normalizeStudioImageQuality("high")).toBe("standard");
    expect(normalizeStudioImageQuality(undefined)).toBe("standard");
  });

  it("maps the Studio ladder to GPT Image 2 output quality", () => {
    expect(gptOutputQualityForStudio("draft")).toBe("low");
    expect(gptOutputQualityForStudio("standard")).toBe("medium");
    expect(gptOutputQualityForStudio("pro")).toBe("high");
  });

  it("exposes user-facing labels", () => {
    expect(studioImageQualityLabel("draft")).toBe("Draft");
    expect(studioImageQualityLabel("standard")).toBe("Standard");
    expect(studioImageQualityLabel("pro")).toBe("High");
  });
});
