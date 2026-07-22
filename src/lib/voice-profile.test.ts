import { describe, expect, it } from "vitest";
import {
  buildVoiceOnboardingAnswers,
  getVoicePersonality,
  mergeHistoryIntoVoiceAnswers,
} from "@/lib/voice-profile";

describe("voice-profile", () => {
  it("maps personality to tone and anti-voice seeds", () => {
    const answers = buildVoiceOnboardingAnswers({
      businessName: "Bella's Beauty",
      whatYouDo: "salon and med spa",
      where: "Austin, TX",
      personalityId: "professional",
      neverSoundLike: "bro culture, hype",
    });
    expect(answers.company).toBe("Bella's Beauty");
    expect(answers.tonePreference).toBe("professional");
    expect(answers.antiVoice).toEqual(["bro culture", "hype"]);
    expect(answers.personalityTraits[0]).toBe("Professional");
    expect(getVoicePersonality("playful").tone).toBe("playful");
  });

  it("merges social history into voice samples and cadence refs", () => {
    const base = buildVoiceOnboardingAnswers({
      businessName: "Maple",
      whatYouDo: "café",
      where: "Chicago",
      personalityId: "warm",
      neverSoundLike: "",
    });
    const merged = mergeHistoryIntoVoiceAnswers(base, {
      tone: "Warm. Local. Unfussy.",
      pillars: ["Menu", "Community"],
      weSay: ["Come hungry", "No rush"],
      weDontSay: ["Limited time!!!"],
      visualStyle: ["bright interiors"],
      hashtags: ["#chi", "#brunch"],
      postingCadence: "3x / week",
      mediaMix: "70% image / 30% video",
    });
    expect(merged.voiceSamples).toEqual(
      expect.arrayContaining(["Come hungry", "#chi"]),
    );
    expect(merged.visualRefs).toEqual(
      expect.arrayContaining([
        "bright interiors",
        "Cadence: 3x / week",
        "Media mix: 70% image / 30% video",
      ]),
    );
    expect(merged.contentFocus).toEqual(expect.arrayContaining(["Menu", "Community"]));
  });
});
