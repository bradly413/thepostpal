import { describe, expect, it } from "vitest";
import { parseDirectorDecision } from "@/lib/studio/director";

const PROMPT_60W =
  "A towering strawberry smoothie in a tall glass, hero of the frame on a solid red seamless backdrop, condensation beading on the glass, one mint leaf as garnish, 85mm lens at f/2.8, a single large softbox from camera left, bright high-key commercial grade, vivid saturated red and pink palette, crisp premium textures.";

describe("parseDirectorDecision", () => {
  it("parses a full single-image decision", () => {
    const d = parseDirectorDecision(
      JSON.stringify({
        platform: "instagram",
        format: "single",
        allowText: false,
        styleDirected: false,
        clarify: null,
        imagePrompt: PROMPT_60W,
      }),
    );
    expect(d).not.toBeNull();
    expect(d!.platform).toBe("instagram");
    expect(d!.format).toBe("single");
    expect(d!.allowText).toBe(false);
    expect(d!.clarify).toBeUndefined();
    expect(d!.imagePrompt).toBe(PROMPT_60W);
  });

  it("extracts JSON from a chatty reply", () => {
    const d = parseDirectorDecision(
      `Here is the routing:\n{"platform":"facebook","format":"single","allowText":false,"styleDirected":true,"imagePrompt":"${PROMPT_60W}"}\nDone.`,
    );
    expect(d).not.toBeNull();
    expect(d!.platform).toBe("facebook");
    expect(d!.styleDirected).toBe(true);
  });

  it("clarify passes through without an imagePrompt", () => {
    const d = parseDirectorDecision(
      JSON.stringify({
        platform: "instagram",
        format: "single",
        clarify: "Which product is launching — the serum or the lash kit?",
        imagePrompt: "",
      }),
    );
    expect(d).not.toBeNull();
    expect(d!.clarify).toContain("serum");
  });

  it("clamps carousel slides to 2–5", () => {
    const d = parseDirectorDecision(
      JSON.stringify({
        platform: "instagram",
        format: "carousel",
        slides: 9,
        imagePrompt: PROMPT_60W,
      }),
    );
    expect(d!.format).toBe("carousel");
    expect(d!.slides).toBe(5);
  });

  it("allowText requires overlayText", () => {
    const withWords = parseDirectorDecision(
      JSON.stringify({
        platform: "instagram",
        format: "single",
        allowText: true,
        overlayText: "FRIDAY: $5 OFF",
        imagePrompt: PROMPT_60W,
      }),
    );
    expect(withWords!.allowText).toBe(true);
    expect(withWords!.overlayText).toBe("FRIDAY: $5 OFF");

    const withoutWords = parseDirectorDecision(
      JSON.stringify({
        platform: "instagram",
        format: "single",
        allowText: true,
        imagePrompt: PROMPT_60W,
      }),
    );
    expect(withoutWords!.allowText).toBe(false);
  });

  it("rejects garbage and unusable prompts", () => {
    expect(parseDirectorDecision("no json here")).toBeNull();
    expect(
      parseDirectorDecision(JSON.stringify({ platform: "instagram", imagePrompt: "too short" })),
    ).toBeNull();
  });

  it("defaults unknown platforms to instagram", () => {
    const d = parseDirectorDecision(
      JSON.stringify({ platform: "myspace", format: "single", imagePrompt: PROMPT_60W }),
    );
    expect(d!.platform).toBe("instagram");
  });
});
