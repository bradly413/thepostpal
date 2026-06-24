import { describe, expect, it } from "vitest";
import {
  isValidLeadEmail,
  normalizeLeadEmail,
  pickLeadEmail,
  resolvePaidGenerationGate,
} from "@/lib/onboarding-lead";

describe("isValidLeadEmail", () => {
  it("accepts a plausible email", () => {
    expect(isValidLeadEmail("owner@shop.com")).toBe(true);
    expect(isValidLeadEmail("a.b+tag@sub.domain.io")).toBe(true);
  });

  it("rejects malformed / empty / non-string values", () => {
    expect(isValidLeadEmail("not-an-email")).toBe(false);
    expect(isValidLeadEmail("no@domain")).toBe(false);
    expect(isValidLeadEmail("two@@at.com")).toBe(false);
    expect(isValidLeadEmail("spaces in@email.com")).toBe(false);
    expect(isValidLeadEmail("")).toBe(false);
    expect(isValidLeadEmail("   ")).toBe(false);
    expect(isValidLeadEmail(undefined)).toBe(false);
    expect(isValidLeadEmail(null)).toBe(false);
    expect(isValidLeadEmail(42)).toBe(false);
  });

  it("rejects absurdly long emails", () => {
    expect(isValidLeadEmail(`${"a".repeat(250)}@x.com`)).toBe(false);
  });
});

describe("normalizeLeadEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeLeadEmail("  Owner@Shop.COM ")).toBe("owner@shop.com");
  });
});

describe("pickLeadEmail", () => {
  it("returns the first valid candidate, normalized", () => {
    expect(pickLeadEmail(undefined, "Owner@Shop.com")).toBe("owner@shop.com");
    expect(pickLeadEmail("top@level.com", "answers@email.com")).toBe("top@level.com");
  });

  it("skips invalid candidates", () => {
    expect(pickLeadEmail("garbage", "real@email.com")).toBe("real@email.com");
  });

  it("returns null when nothing is valid", () => {
    expect(pickLeadEmail(undefined, "nope", 5)).toBeNull();
  });
});

describe("resolvePaidGenerationGate", () => {
  it("always allows authenticated sessions", () => {
    expect(resolvePaidGenerationGate({ isSession: true, leadEmail: null })).toEqual({
      allowed: true,
      emailRequired: false,
      leadEmail: null,
    });
  });

  it("allows guests with a captured email", () => {
    expect(
      resolvePaidGenerationGate({ isSession: false, leadEmail: "lead@x.com" }),
    ).toEqual({ allowed: true, emailRequired: false, leadEmail: "lead@x.com" });
  });

  it("blocks anonymous guests with no email (the anti-farming gate)", () => {
    expect(resolvePaidGenerationGate({ isSession: false, leadEmail: null })).toEqual({
      allowed: false,
      emailRequired: true,
      leadEmail: null,
    });
  });
});
