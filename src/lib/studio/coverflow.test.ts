import { describe, expect, it } from "vitest";
import { carouselSlidePrompt, coverflowRole } from "./coverflow";

describe("coverflowRole", () => {
  it("assigns classic positions around the selected index", () => {
    expect(coverflowRole(2, 2)).toBe("selected");
    expect(coverflowRole(1, 2)).toBe("prev");
    expect(coverflowRole(3, 2)).toBe("next");
    expect(coverflowRole(0, 2)).toBe("prevLeftSecond");
    expect(coverflowRole(4, 2)).toBe("nextRightSecond");
    expect(coverflowRole(0, 3)).toBe("hideLeft");
    expect(coverflowRole(5, 2)).toBe("hideRight");
  });
});

describe("carouselSlidePrompt", () => {
  it("marks slide 1 as hero and later slides as distinct beats", () => {
    const s1 = carouselSlidePrompt("spring menu launch", 0, 4);
    expect(s1).toContain("slide 1 of 4");
    const s3 = carouselSlidePrompt("spring menu launch", 2, 4);
    expect(s3).toContain("slide 3 of 4");
    expect(s3).toMatch(/visually different|different/i);
    expect(s3).not.toContain("slide 1 of 4");
  });
});
