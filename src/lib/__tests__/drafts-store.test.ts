import { describe, it, expect } from "vitest";
import { generateWeeklyPosts } from "../post-generator-tool";

describe("post generator tool", () => {
  it("returns five posts", () => {
    const plan = generateWeeklyPosts({
      businessType: "bakery",
      whatsNew: "Sourdough is back",
      offerOrEvent: "Saturday class",
      tone: "calm",
    });
    expect(plan.posts).toHaveLength(5);
  });

  it("uses bakery template when type matches", () => {
    const plan = generateWeeklyPosts({
      businessType: "bakery",
      whatsNew: "Fresh croissants",
      offerOrEvent: "",
      tone: "dry",
    });
    expect(plan.posts[0].copy).toContain("Fresh croissants");
  });
});
