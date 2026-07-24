import { describe, expect, it } from "vitest";
import {
  buildResponsesInput,
  referenceRoleForSource,
  uniqueHttpsUrls,
  withIndexedReferenceInstructions,
} from "@/lib/studio/openai-vision-input";

describe("openai-vision-input", () => {
  it("dedupes and caps vision URLs", () => {
    expect(
      uniqueHttpsUrls([
        "https://a.com/1.jpg",
        "https://a.com/1.jpg",
        "https://b.com/2.jpg",
        "http://insecure.com/x.jpg",
        "data:image/png;base64,abc",
      ]),
    ).toEqual(["https://a.com/1.jpg", "https://b.com/2.jpg", "data:image/png;base64,abc"]);
  });

  it("returns plain string input when no images", () => {
    expect(buildResponsesInput("draw a cat", [])).toBe("draw a cat");
  });

  it("builds multimodal user content when images are present", () => {
    const input = buildResponsesInput("product ad", [
      { type: "input_image", image_url: "https://brand.com/tube.jpg", detail: "high" },
    ]);
    expect(Array.isArray(input)).toBe(true);
    if (!Array.isArray(input)) return;
    expect(input[0].role).toBe("user");
    expect(input[0].content[0]).toEqual({ type: "input_text", text: "product ad" });
    expect(input[0].content[1]?.type).toBe("input_image");
  });

  it("labels official logos and attached subjects instead of treating every image alike", () => {
    expect(
      referenceRoleForSource("https://brand.com/assets/official-logo.png", 0),
    ).toMatch(/official logo/i);
    expect(
      referenceRoleForSource("https://brand.com/product.jpg", 0, {
        attachedReference: true,
      }),
    ).toMatch(/primary attached subject/i);
    expect(referenceRoleForSource("https://brand.com/hero.jpg", 0)).toMatch(
      /primary website/i,
    );
    expect(referenceRoleForSource("https://brand.com/lifestyle.jpg", 1)).toMatch(
      /supporting website/i,
    );
  });

  it("adds indexed reference roles to the generation prompt", () => {
    const prompt = withIndexedReferenceInstructions("Create a launch post.", [
      "OFFICIAL LOGO. Preserve exactly.",
      "STYLE REFERENCE. Use palette only.",
    ]);
    expect(prompt).toContain("Image 1 — OFFICIAL LOGO");
    expect(prompt).toContain("Image 2 — STYLE REFERENCE");
    expect(prompt).toMatch(/reference wins/i);
  });
});
