import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the model layer so nothing spends and results are deterministic.
vi.mock("ai", () => ({ generateObject: vi.fn() }));
vi.mock("@/lib/ai/anthropic", () => ({ anthropic: () => ({ id: "mock-model" }) }));

import { generateObject } from "ai";
import {
  enrichVoiceSemantics,
  enrichVisualSemantics,
  enrichBrandDna,
  visualSemanticsSchema,
} from "@/lib/brand-dna/semantic-enrichment";

const mockGen = generateObject as unknown as ReturnType<typeof vi.fn>;

const VISUAL = {
  subjects: ["plated food", "interior"],
  composition: ["flat-lay", "candid"],
  lighting: "warm natural daylight",
  mood: ["cozy", "inviting"],
  textOverlayStyle: "none",
  aestheticConsistency: 0.8,
  summary: "Warm, candid food photography with a cozy neighborhood feel.",
};
const VOICE = {
  tone: "Warm. Local. Honest.",
  pillars: ["food", "team", "community"],
  weSay: ["come hungry", "see you soon", "made fresh"],
  weDontSay: ["world-class", "synergy", "leverage"],
};

beforeEach(() => {
  mockGen.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("visualSemanticsSchema", () => {
  it("accepts a well-formed object", () => {
    expect(visualSemanticsSchema.safeParse(VISUAL).success).toBe(true);
  });
  it("rejects an out-of-range consistency score", () => {
    expect(visualSemanticsSchema.safeParse({ ...VISUAL, aestheticConsistency: 1.5 }).success).toBe(false);
  });
});

describe("enrichVoiceSemantics", () => {
  it("returns null without an API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await enrichVoiceSemantics(["a caption here"])).toBeNull();
    expect(mockGen).not.toHaveBeenCalled();
  });

  it("returns null for empty captions (no spend)", async () => {
    expect(await enrichVoiceSemantics(["  ", ""])).toBeNull();
    expect(mockGen).not.toHaveBeenCalled();
  });

  it("returns the model object on success", async () => {
    mockGen.mockResolvedValue({ object: VOICE });
    expect(await enrichVoiceSemantics(["made fresh daily", "come hungry"])).toEqual(VOICE);
    expect(mockGen).toHaveBeenCalledTimes(1);
  });

  it("degrades to null on model failure", async () => {
    mockGen.mockRejectedValue(new Error("upstream 500"));
    expect(await enrichVoiceSemantics(["a real caption"])).toBeNull();
  });
});

describe("enrichVisualSemantics", () => {
  const imgs = [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])];

  it("returns null for no images (no spend)", async () => {
    expect(await enrichVisualSemantics([])).toBeNull();
    expect(mockGen).not.toHaveBeenCalled();
  });

  it("returns the model object on success", async () => {
    mockGen.mockResolvedValue({ object: VISUAL });
    expect(await enrichVisualSemantics(imgs)).toEqual(VISUAL);
    expect(mockGen).toHaveBeenCalledTimes(1);
  });

  it("caps the number of images sent to the model", async () => {
    mockGen.mockResolvedValue({ object: VISUAL });
    const many = Array.from({ length: 20 }, (_, i) => Buffer.from([i]));
    await enrichVisualSemantics(many, { maxImages: 3 });
    const call = mockGen.mock.calls[0][0];
    const imageParts = call.messages[0].content.filter((c: { type: string }) => c.type === "image");
    expect(imageParts).toHaveLength(3);
  });

  it("degrades to null on model failure", async () => {
    mockGen.mockRejectedValue(new Error("vision timeout"));
    expect(await enrichVisualSemantics(imgs)).toBeNull();
  });
});

describe("enrichBrandDna", () => {
  it("runs both and merges; each side degrades independently", async () => {
    mockGen.mockImplementation(async ({ schema }: { schema: unknown }) => {
      // The voice call passes a `prompt`; the visual call passes `messages`.
      return { object: schema === visualSemanticsSchema ? VISUAL : VOICE };
    });
    const out = await enrichBrandDna({
      captions: ["come hungry"],
      images: [Buffer.from([1])],
    });
    expect(out.voice).toEqual(VOICE);
    expect(out.visual).toEqual(VISUAL);
  });

  it("returns nulls when there is nothing to analyze", async () => {
    const out = await enrichBrandDna({ captions: [], images: [] });
    expect(out).toEqual({ voice: null, visual: null });
    expect(mockGen).not.toHaveBeenCalled();
  });
});
