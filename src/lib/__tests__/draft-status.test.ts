import { describe, it, expect } from "vitest";
import { canTransition } from "../draft-status";

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
