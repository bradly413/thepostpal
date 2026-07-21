import { describe, expect, it, vi, afterEach } from "vitest";
import {
  extractImageFromInteraction,
  generateNanoBananaImage,
  interactionsErrorMessage,
  NANO_BANANA_MODELS,
} from "@/lib/studio/nano-banana";

describe("extractImageFromInteraction", () => {
  it("reads SDK convenience output_image when present", () => {
    const got = extractImageFromInteraction({
      output_image: { data: "abc", mime_type: "image/jpeg" },
    });
    expect(got).toEqual({ data: "abc", mimeType: "image/jpeg", text: "" });
  });

  it("reads the final model_output image from REST steps (no output_image)", () => {
    const got = extractImageFromInteraction({
      steps: [
        { type: "thought", signature: "huge" } as never,
        {
          type: "model_output",
          content: [{ type: "image", data: "FINAL", mime_type: "image/jpeg" }],
        },
      ],
    });
    expect(got?.data).toBe("FINAL");
    expect(got?.mimeType).toBe("image/jpeg");
  });

  it("prefers the last image when thought + model_output both have images", () => {
    const got = extractImageFromInteraction({
      steps: [
        {
          type: "thought",
          summary: [{ type: "image", data: "THOUGHT", mime_type: "image/jpeg" }],
        },
        {
          type: "model_output",
          content: [{ type: "image", data: "FINAL", mime_type: "image/jpeg" }],
        },
      ],
    });
    expect(got?.data).toBe("FINAL");
  });

  it("defaults mime to jpeg when omitted", () => {
    const got = extractImageFromInteraction({
      steps: [{ type: "model_output", content: [{ type: "image", data: "x" }] }],
    });
    expect(got?.mimeType).toBe("image/jpeg");
  });

  it("returns null when no image blocks exist", () => {
    expect(extractImageFromInteraction({ steps: [{ type: "thought" }] })).toBeNull();
  });
});

describe("interactionsErrorMessage", () => {
  it("reads nested Google error.message", () => {
    expect(
      interactionsErrorMessage({
        error: {
          message:
            "The value 'image/png' is not supported for 'response_format.mime_type'. Supported values: 'image/jpeg'.",
        },
      }),
    ).toMatch(/image\/jpeg/);
  });

  it("falls back when empty", () => {
    expect(interactionsErrorMessage({})).toBe("Image generation failed");
  });
});

describe("generateNanoBananaImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends jpeg mime_type and aspect_ratio in response_format", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            steps: [
              {
                type: "model_output",
                content: [{ type: "image", data: "Qk0=", mime_type: "image/jpeg" }],
              },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateNanoBananaImage({
      apiKey: "test",
      quality: "pro",
      prompt: "red smoothie",
      aspectRatio: "4:5",
      imageSize: "2K",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model).toBe(NANO_BANANA_MODELS.pro);
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.imageDataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    }

    const init = fetchMock.mock.calls[0]?.[1];
    expect(typeof init?.body).toBe("string");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("gemini-3-pro-image");
    expect(body.response_format).toEqual({
      type: "image",
      mime_type: "image/jpeg",
      aspect_ratio: "4:5",
      image_size: "2K",
    });
  });

  it("surfaces Google png mime validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message:
                "The value 'image/png' is not supported for 'response_format.mime_type'. Supported values: 'image/jpeg'.",
            },
          }),
          { status: 400 },
        ),
      ),
    );

    const result = await generateNanoBananaImage({
      apiKey: "test",
      quality: "pro",
      prompt: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/Supported values: 'image\/jpeg'/);
    }
  });
});
