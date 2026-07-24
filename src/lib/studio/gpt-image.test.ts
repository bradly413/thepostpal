import { describe, expect, it } from "vitest";
import {
  extractImageFromResponsesResponse,
  gptImageErrorMessage,
  gptImageSizeForAspect,
  gptOrchestratorModels,
  isRetryableResponsesError,
} from "@/lib/studio/gpt-image";

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

describe("gptOrchestratorModels", () => {
  it("includes fallback models after the configured default", () => {
    const models = gptOrchestratorModels();
    expect(models.length).toBeGreaterThanOrEqual(2);
    expect(models).toContain("gpt-4.1-mini");
  });
});

describe("isRetryableResponsesError", () => {
  it("retries unknown model errors", () => {
    expect(isRetryableResponsesError(400, "The model gpt-5.6 does not exist")).toBe(true);
    expect(isRetryableResponsesError(502, "upstream failed")).toBe(false);
  });
});

describe("extractImageFromResponsesResponse", () => {
  it("returns the last completed image_generation_call result", () => {
    const b64 = "abc123";
    expect(
      extractImageFromResponsesResponse({
        output: [
          { type: "message", status: "completed" },
          { type: "image_generation_call", status: "completed", result: b64 },
        ],
      }),
    ).toBe(b64);
  });
  it("ignores incomplete calls", () => {
    expect(
      extractImageFromResponsesResponse({
        output: [{ type: "image_generation_call", status: "in_progress" }],
      }),
    ).toBeNull();
  });
});
