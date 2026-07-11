import { describe, expect, it } from "vitest";
import {
  isRepromptDelta,
  shouldEditFromReference,
} from "@/lib/studio/reprompt-delta";

describe("isRepromptDelta", () => {
  it("detects explicit edit requests", () => {
    expect(
      isRepromptDelta("make it brighter and warmer", "weekend brunch spread on a wooden table"),
    ).toBe(true);
  });

  it("treats lighting/framing edits as reprompts even when the prior brief differs", () => {
    expect(isRepromptDelta("a brighter closeup of the cupcake", "birthday dessert post")).toBe(true);
    expect(isRepromptDelta("a brighter closeup of the cupcake", "a cupcake")).toBe(true);
  });

  it("treats a new short subject as a fresh brief, not an edit", () => {
    expect(isRepromptDelta("a burger", "a palm tree")).toBe(false);
    expect(isRepromptDelta("latte art", "a palm tree")).toBe(false);
  });

  it("treats same-topic expansion as an edit", () => {
    expect(isRepromptDelta("a palm tree on the beach", "a palm tree")).toBe(true);
    expect(isRepromptDelta("wider shot with more sky", "a palm tree on the beach")).toBe(true);
  });

  it("rejects identical re-submits", () => {
    const prev = "make a instagram post about our weekend brunch";
    expect(isRepromptDelta(prev, prev)).toBe(false);
  });

  it("rejects when there is no previous prompt", () => {
    expect(isRepromptDelta("brighter", null)).toBe(false);
  });
});

describe("shouldEditFromReference", () => {
  it("edits from canvas when prompt anchor is missing but request is edit-only", () => {
    expect(shouldEditFromReference("close up shot brighter", "", true)).toBe(true);
    expect(shouldEditFromReference("close up shot brighter", null, true)).toBe(true);
  });

  it("does not edit from canvas when user names a new subject", () => {
    expect(shouldEditFromReference("a burger", "cupcake", true)).toBe(false);
  });

  it("requires an image on canvas", () => {
    expect(shouldEditFromReference("brighter", "cupcake", false)).toBe(false);
  });
});
