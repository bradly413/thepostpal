import { describe, expect, it } from "vitest";
import { shouldReplaceWebsiteReference } from "./reference-provenance";

describe("shouldReplaceWebsiteReference", () => {
  it("replaces an automatic website preview for a new website turn", () => {
    expect(
      shouldReplaceWebsiteReference("website", "https://therestaurantcreatives.com"),
    ).toBe(true);
  });

  it.each(["manual", "direct", "history"] as const)(
    "preserves a %s reference when the prompt also names a website",
    (source) => {
      expect(
        shouldReplaceWebsiteReference(source, "https://therestaurantcreatives.com"),
      ).toBe(false);
    },
  );

  it("keeps the current website preview when no new website was requested", () => {
    expect(shouldReplaceWebsiteReference("website", null)).toBe(false);
  });
});
