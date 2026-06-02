import { describe, it, expect } from "vitest";
import {
  PRICING_TIERS,
  getPublicTiers,
  getPremiumTiers,
  getTierById,
  normalizePricingTierId,
  pricingTierToOrganizationPlan,
} from "../pricing";

describe("pricing tiers", () => {
  it("includes solo, command, and brc-custom", () => {
    expect(PRICING_TIERS).toHaveLength(3);
    const ids = PRICING_TIERS.map((t) => t.id);
    expect(ids).toContain("solo");
    expect(ids).toContain("command");
    expect(ids).toContain("brc-custom");
  });

  it("returns two public tiers (solo + command)", () => {
    const publicTiers = getPublicTiers();
    expect(publicTiers).toHaveLength(2);
    expect(publicTiers.every((t) => t.tier === "public")).toBe(true);
  });

  it("returns one premium tier", () => {
    const premium = getPremiumTiers();
    expect(premium).toHaveLength(1);
    expect(premium[0]?.id).toBe("brc-custom");
  });

  it("finds tier by id", () => {
    expect(getTierById("solo")?.price).toBe("$99");
    expect(getTierById("command")?.price).toBe("$249");
    expect(getTierById("command")?.cta).toBe("Start Command");
  });

  it("normalizes legacy plan query params", () => {
    expect(normalizePricingTierId("good")).toBe("solo");
    expect(normalizePricingTierId("best")).toBe("solo");
    expect(normalizePricingTierId("house-account")).toBe("command");
    expect(normalizePricingTierId("teams")).toBe("command");
  });

  it("maps pricing ids to organization plan enum", () => {
    expect(pricingTierToOrganizationPlan("solo")).toBe("solo");
    expect(pricingTierToOrganizationPlan("command")).toBe("house_account");
    expect(pricingTierToOrganizationPlan("brc-custom")).toBeNull();
  });

  it("does not use Enterprise naming", () => {
    PRICING_TIERS.forEach((t) => {
      expect(t.name.toLowerCase()).not.toContain("enterprise");
    });
  });
});
