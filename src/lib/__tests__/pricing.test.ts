import { describe, it, expect } from "vitest";
import {
  PRICING_TIERS,
  getPublicTiers,
  getPremiumTiers,
  getTierById,
} from "../pricing";

describe("pricing tiers", () => {
  it("includes all six tiers", () => {
    expect(PRICING_TIERS).toHaveLength(6);
    const ids = PRICING_TIERS.map((t) => t.id);
    expect(ids).toContain("good");
    expect(ids).toContain("better");
    expect(ids).toContain("best");
    expect(ids).toContain("teams");
    expect(ids).toContain("house-account");
    expect(ids).toContain("brc-custom");
  });

  it("returns three public tiers", () => {
    const publicTiers = getPublicTiers();
    expect(publicTiers).toHaveLength(3);
    expect(publicTiers.every((t) => t.tier === "public")).toBe(true);
  });

  it("returns three premium tiers", () => {
    const premium = getPremiumTiers();
    expect(premium).toHaveLength(3);
    expect(premium.every((t) => t.tier === "premium")).toBe(true);
  });

  it("finds tier by id", () => {
    expect(getTierById("good")?.price).toBe("$29");
    expect(getTierById("better")?.price).toBe("$59");
    expect(getTierById("best")?.price).toBe("$99");
    expect(getTierById("house-account")?.cta).toBe("Open a House Account");
  });

  it("does not use Enterprise naming", () => {
    PRICING_TIERS.forEach((t) => {
      expect(t.name.toLowerCase()).not.toContain("enterprise");
    });
  });
});
