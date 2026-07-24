import { describe, expect, it } from "vitest";
import { withFreshGenerationVariation } from "./generation-variation";

describe("withFreshGenerationVariation", () => {
  const prompt = "Create a detailed close-up of a chef chopping fresh herbs.";

  it("keeps an identical brief but makes each generation request distinct", () => {
    const first = withFreshGenerationVariation(
      prompt,
      "11111111-1111-4111-8111-111111111111",
    );
    const second = withFreshGenerationVariation(
      prompt,
      "22222222-2222-4222-8222-222222222222",
    );

    expect(first).toContain(prompt);
    expect(second).toContain(prompt);
    expect(first).not.toBe(second);
  });

  it("is stable for the same server-generated variation key", () => {
    const key = "33333333-3333-4333-8333-333333333333";

    expect(withFreshGenerationVariation(prompt, key)).toBe(
      withFreshGenerationVariation(prompt, key),
    );
  });

  it("uses layout variation for designed graphics", () => {
    const result = withFreshGenerationVariation(
      "Create a launch announcement.",
      "44444444-4444-4444-8444-444444444444",
      "design",
    );

    expect(result).toContain("newly composed interpretation");
    expect(result).toContain("production metadata only");
    expect(result).toContain("Do not draw, print, spell");
  });
});
