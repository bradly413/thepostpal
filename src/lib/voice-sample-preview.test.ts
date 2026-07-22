import { describe, expect, it } from "vitest";
import {
  buildCaptionSamples,
  buildPersonalizedCaptions,
  rankVoicePersonalities,
} from "@/lib/voice-sample-preview";

describe("rankVoicePersonalities", () => {
  it("ranks med spa toward warm + elevated", () => {
    expect(rankVoicePersonalities("med spa").slice(0, 2)).toEqual([
      "warm",
      "elevated",
    ]);
  });

  it("ranks contractors toward straight + bold", () => {
    expect(rankVoicePersonalities("HVAC contractor").slice(0, 2)).toEqual([
      "straight",
      "bold",
    ]);
  });
});

describe("buildPersonalizedCaptions", () => {
  it("personalizes every voice with business context", () => {
    const rows = buildPersonalizedCaptions({
      businessName: "Aurora",
      whatYouDo: "med spa",
      where: "Austin",
    });
    expect(rows).toHaveLength(8);
    expect(rows[0]?.personalityId).toBe("warm");
    expect(rows[0]?.recommended).toBe(true);
    expect(rows[0]?.caption).toContain("Aurora");
    expect(rows[0]?.caption).toContain("med spa");
    expect(rows[0]?.caption).toContain("Austin");
    expect(rows.filter((r) => r.recommended)).toHaveLength(2);
  });
});

describe("buildCaptionSamples", () => {
  it("returns the two best-ranked directions", () => {
    const samples = buildCaptionSamples({
      businessName: "Aurora",
      whatYouDo: "med spa",
      where: "Austin",
    });
    expect(samples).toHaveLength(2);
    expect(samples[0]?.personalityId).toBe("warm");
    expect(samples[1]?.personalityId).toBe("elevated");
  });
});
