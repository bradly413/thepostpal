import { describe, expect, it } from "vitest";
import {
  GPT_RESPONSES_MODEL,
  boundedProviderTimeoutMs,
  classifyGptFallbackReason,
  extractImageFromResponsesResponse,
  gptImageErrorMessage,
  gptImageSizeForAspect,
  gptOrchestratorModels,
  gptProviderTimeoutMsForQuality,
  isRetryableResponsesError,
  selectGptFailure,
} from "@/lib/studio/gpt-image";
import {
  STUDIO_GEMINI_FALLBACK_RESERVE_MS,
  STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS,
  STUDIO_GPT_STANDARD_PROVIDER_TIMEOUT_MS,
  STUDIO_IMAGE_CLIENT_TIMEOUT_MS,
  STUDIO_IMAGE_ROUTE_BUDGET_MS,
  STUDIO_IMAGE_WATCHDOG_MS,
} from "@/lib/studio/image-generation-budget";

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
  it("puts the configured/default model before fallbacks", () => {
    const models = gptOrchestratorModels();
    expect(models.length).toBeGreaterThanOrEqual(2);
    expect(models[0]).toBe(GPT_RESPONSES_MODEL);
    expect(models).toContain("gpt-4.1-mini");
  });
});

describe("boundedProviderTimeoutMs", () => {
  it("caps a provider call while preserving the fallback reserve", () => {
    expect(
      boundedProviderTimeoutMs({
        deadlineMs: 400_000,
        reserveMs: STUDIO_GEMINI_FALLBACK_RESERVE_MS,
        nowMs: 100_000,
      }),
    ).toBe(STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS);
    expect(
      boundedProviderTimeoutMs({
        deadlineMs: 220_000,
        reserveMs: STUDIO_GEMINI_FALLBACK_RESERVE_MS,
        nowMs: 100_000,
      }),
    ).toBe(30_000);
  });

  it("returns zero instead of overrunning an exhausted deadline", () => {
    expect(
      boundedProviderTimeoutMs({
        deadlineMs: 120_000,
        reserveMs: STUDIO_GEMINI_FALLBACK_RESERVE_MS,
        nowMs: 100_000,
      }),
    ).toBe(0);
  });
});

describe("Studio image generation budget", () => {
  it("gives High more than two minutes while preserving fallback headroom", () => {
    expect(STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS).toBeGreaterThan(120_000);
    expect(STUDIO_GPT_STANDARD_PROVIDER_TIMEOUT_MS).toBeLessThan(
      STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS,
    );
    expect(STUDIO_IMAGE_ROUTE_BUDGET_MS).toBeGreaterThanOrEqual(
      STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS + STUDIO_GEMINI_FALLBACK_RESERVE_MS,
    );
  });

  it("selects the provider cap from the requested quality", () => {
    expect(gptProviderTimeoutMsForQuality("standard")).toBe(
      STUDIO_GPT_STANDARD_PROVIDER_TIMEOUT_MS,
    );
    expect(gptProviderTimeoutMsForQuality("pro")).toBe(
      STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS,
    );
  });

  it("keeps client recovery outside the server deadline", () => {
    expect(STUDIO_IMAGE_CLIENT_TIMEOUT_MS).toBeGreaterThan(STUDIO_IMAGE_ROUTE_BUDGET_MS);
    expect(STUDIO_IMAGE_WATCHDOG_MS).toBeGreaterThan(STUDIO_IMAGE_CLIENT_TIMEOUT_MS);
  });
});

describe("classifyGptFallbackReason", () => {
  it("separates timeouts from other provider errors", () => {
    expect(classifyGptFallbackReason(504, "Image generation timed out.")).toBe(
      "timeout",
    );
    expect(classifyGptFallbackReason(502, "Upstream timeout")).toBe("timeout");
    expect(classifyGptFallbackReason(429, "Rate limit reached")).toBe(
      "provider_error",
    );
  });
});

describe("selectGptFailure", () => {
  it("returns the terminal failure when no provider timed out", () => {
    expect(
      selectGptFailure(
        { ok: false, status: 429, error: "Rate limit", provider: "images" },
        { ok: false, status: 422, error: "No image", provider: "responses" },
      ),
    ).toMatchObject({ status: 422, provider: "responses" });
  });

  it("preserves a timeout even when another provider error follows it", () => {
    expect(
      selectGptFailure(
        { ok: false, status: 504, error: "Timed out", provider: "responses" },
        { ok: false, status: 502, error: "Could not reach service", provider: "images" },
      ),
    ).toMatchObject({ status: 504, provider: "responses" });
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
