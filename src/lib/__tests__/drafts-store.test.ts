import { describe, it, expect } from "vitest";
import { canTransition } from "../drafts-store";
import { generateWeeklyPosts } from "../post-generator-tool";

describe("draft status transitions", () => {
  it("allows needs_review to approved", () => {
    expect(canTransition("needs_review", "approved")).toBe(true);
  });

  it("blocks published to draft", () => {
    expect(canTransition("published", "draft")).toBe(false);
  });

  it("allows skip from needs_review", () => {
    expect(canTransition("needs_review", "skipped")).toBe(true);
  });
});

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
