import { describe, expect, it } from "vitest";
import { canTransition } from "../draft-status";

describe("canTransition", () => {
  it("allows review to approved", () => {
    expect(canTransition("needs_review", "approved")).toBe(true);
  });

  it("blocks published to draft", () => {
    expect(canTransition("published", "draft")).toBe(false);
  });

  it("allows review to skipped", () => {
    expect(canTransition("needs_review", "skipped")).toBe(true);
  });
});
