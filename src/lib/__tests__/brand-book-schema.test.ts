import { describe, expect, it } from "vitest";
import { brandVoiceAiSchema } from "@/lib/brand-book-schema";

// Guards the P3.1 loosening: the strict schema used to force collateralPrompts to
// be EXACTLY 3 with tight char caps, which deterministically dropped realistic
// model output to the silent fallback. These cases would have failed the old
// schema and must now pass.

const base = {
  paletteId: "smart-casual",
  hero: "We make the kind of haircut you actually look forward to.",
  weSay: ["come on in", "we'll take care of you"],
  weDontSay: ["luxury experience", "world-class service"],
  traits: ["warm", "no-nonsense"],
  collateralPrompts: [
    "A custom kraft paper bag with the shop's wordmark, soft morning window light, matte finish.",
  ],
};

describe("brandVoiceAiSchema (loosened)", () => {
  it("accepts a single collateral prompt (was .length(3))", () => {
    expect(brandVoiceAiSchema.safeParse(base).success).toBe(true);
  });

  it("accepts up to four collateral prompts", () => {
    const four = {
      ...base,
      collateralPrompts: [
        "Custom packaging on a linen surface, warm light.",
        "A branded ceramic coaster on weathered oak.",
        "A heavy-cotton staff tee, studio lighting.",
        "A canvas apron hung on a brass hook.",
      ],
    };
    expect(brandVoiceAiSchema.safeParse(four).success).toBe(true);
  });

  it("accepts two weSay / weDontSay / traits (was .min(3))", () => {
    expect(brandVoiceAiSchema.safeParse(base).success).toBe(true);
  });

  it("still rejects zero collateral prompts", () => {
    expect(
      brandVoiceAiSchema.safeParse({ ...base, collateralPrompts: [] }).success,
    ).toBe(false);
  });

  it("still rejects an invented paletteId", () => {
    expect(
      brandVoiceAiSchema.safeParse({ ...base, paletteId: "made-up" }).success,
    ).toBe(false);
  });
});
