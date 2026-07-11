import { describe, expect, it } from "vitest";
import {
  composeSuffixForBrief,
  enrichScenicBrief,
  generationSuffixForBrief,
  isListingBrief,
  inferPlatformIdFromIntent,
  isMinimalScenicBrief,
  isScenicBrief,
  LISTING_REFERENCE_GENERATION_SUFFIX,
  photoDirectionForBrief,
  SCENIC_PHOTO_DIRECTION,
} from "@/lib/studio/scene-intent";
import { REAL_PHOTO_DEFAULT_DIRECTION } from "@/lib/studio/image-prompt-vivid";

describe("scene-intent", () => {
  it("detects scenic beach briefs", () => {
    expect(isScenicBrief("a palm tree on the beach")).toBe(true);
    expect(isScenicBrief("a palm tree")).toBe(true);
    expect(isScenicBrief("weekend happy hour")).toBe(false);
  });

  it("treats bare palm tree as minimal scenic", () => {
    expect(isMinimalScenicBrief("a palm tree")).toBe(true);
    expect(isMinimalScenicBrief("palm tree outside our restaurant patio")).toBe(false);
  });

  it("enriches bare palm tree with tropical beach setting", () => {
    const enriched = enrichScenicBrief("a palm tree");
    expect(enriched).toMatch(/tropical beach/i);
    expect(enriched).toMatch(/turquoise/i);
    expect(enriched).not.toMatch(/neighborhood|street|suburban/i);
  });

  it("uses wide scenic direction for beach prompts", () => {
    expect(photoDirectionForBrief("a palm tree on the beach")).toBe(SCENIC_PHOTO_DIRECTION);
    expect(photoDirectionForBrief("coffee shop interior")).toBe(REAL_PHOTO_DEFAULT_DIRECTION);
  });

  it("appends anti-urban and wide-shot hints for scenic generation", () => {
    const suffix = generationSuffixForBrief("palm tree beach", false);
    expect(suffix).toMatch(/wide establishing/i);
    expect(suffix).toMatch(/not suburban street/i);
    expect(suffix).toMatch(/no dreamstime/i);
    expect(suffix).toMatch(/level/i);
  });

  it("uses scenic compose suffix when not style-directed", () => {
    const suffix = composeSuffixForBrief("tropical beach", false);
    expect(suffix).toMatch(/wide aspirational scenic/i);
    expect(suffix).toMatch(/not suburban street/i);
  });

  it("detects listing briefs with address and zip", () => {
    const prompt =
      "make an instagram post about my new listing 223 victor ct. in ballwin, mo 63021";
    expect(isListingBrief(prompt)).toBe(true);
  });

  it("does not treat generic business posts as listings", () => {
    expect(isListingBrief("make an instagram post about our weekend happy hour")).toBe(false);
  });

  it("uses listing reference suffix when listing has a photo", () => {
    const suffix = generationSuffixForBrief(
      "new listing 223 victor ct ballwin mo",
      true,
    );
    expect(suffix).toBe(LISTING_REFERENCE_GENERATION_SUFFIX);
  });

  it("infers platform from natural-language intent", () => {
    expect(
      inferPlatformIdFromIntent(
        "make an instagram post about my new listing 223 victor ct",
      ),
    ).toBe("instagram");
  });
});
