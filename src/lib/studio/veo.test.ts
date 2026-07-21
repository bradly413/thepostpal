import { describe, expect, it } from "vitest";
import {
  buildVeoPredictBody,
  parseDataImage,
  parseVeoOperation,
  VEO_MODEL,
} from "@/lib/studio/veo";
import { veoAspectForPlatform } from "@/lib/studio/generate-video-client";

describe("buildVeoPredictBody", () => {
  it("builds text-to-video payload", () => {
    const body = buildVeoPredictBody({
      prompt: "A chef plating pasta",
      aspectRatio: "16:9",
      resolution: "720p",
    });
    expect(body).toEqual({
      instances: [{ prompt: "A chef plating pasta" }],
      parameters: {
        aspectRatio: "16:9",
        resolution: "720p",
        durationSeconds: 8,
      },
    });
  });

  it("includes inline image for image-to-video", () => {
    const body = buildVeoPredictBody({
      prompt: "Gentle camera push-in",
      inlineImage: { mimeType: "image/jpeg", data: "abc123" },
      aspectRatio: "9:16",
    });
    expect(body.instances).toEqual([
      {
        prompt: "Gentle camera push-in",
        image: {
          inlineData: { mimeType: "image/jpeg", data: "abc123" },
        },
      },
    ]);
    expect((body.parameters as { aspectRatio: string }).aspectRatio).toBe("9:16");
  });

  it("truncates prompts to 1024 chars", () => {
    const long = "x".repeat(2000);
    const body = buildVeoPredictBody({ prompt: long });
    expect((body.instances as { prompt: string }[])[0].prompt.length).toBe(1024);
  });
});

describe("parseDataImage", () => {
  it("parses jpeg data URLs", () => {
    expect(parseDataImage("data:image/jpeg;base64,AAA")).toEqual({
      mimeType: "image/jpeg",
      data: "AAA",
    });
  });

  it("returns null for https URLs", () => {
    expect(parseDataImage("https://example.com/a.jpg")).toBeNull();
  });
});

describe("parseVeoOperation", () => {
  it("returns not done while running", () => {
    expect(parseVeoOperation({ done: false })).toEqual({ done: false });
  });

  it("extracts video uri when complete", () => {
    expect(
      parseVeoOperation({
        done: true,
        response: {
          generateVideoResponse: {
            generatedSamples: [{ video: { uri: "https://video.example/v.mp4" } }],
          },
        },
      }),
    ).toEqual({ done: true, videoUri: "https://video.example/v.mp4" });
  });

  it("surfaces operation errors", () => {
    expect(parseVeoOperation({ error: { message: "blocked" } })).toEqual({
      done: true,
      error: "blocked",
    });
  });
});

describe("veoAspectForPlatform", () => {
  it("uses portrait for IG and TikTok", () => {
    expect(veoAspectForPlatform("instagram")).toBe("9:16");
    expect(veoAspectForPlatform("tiktok")).toBe("9:16");
  });

  it("uses landscape for facebook/x", () => {
    expect(veoAspectForPlatform("facebook")).toBe("16:9");
    expect(veoAspectForPlatform("x")).toBe("16:9");
  });
});

describe("VEO_MODEL", () => {
  it("uses Veo 3.1 Fast preview", () => {
    expect(VEO_MODEL).toBe("veo-3.1-fast-generate-preview");
  });
});
