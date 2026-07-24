import { describe, expect, it } from "vitest";
import {
  briefNeedsSceneGeography,
  buildProductAdPrompt,
  composeSuffixForBrief,
  enrichScenicBrief,
  generationSuffixForBrief,
  isBrandOutcomeBrief,
  isListingBrief,
  isProductAdBrief,
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

  it("skips scene geography for product/color briefs", () => {
    expect(briefNeedsSceneGeography("a picture of vibrant red smoothie")).toBe(false);
    expect(briefNeedsSceneGeography("vibrant red smoothie on a red background")).toBe(false);
    expect(briefNeedsSceneGeography("make an instagram post about a vibrant red smoothie")).toBe(
      false,
    );
    expect(briefNeedsSceneGeography("weekend special at our cafe")).toBe(true);
    expect(briefNeedsSceneGeography("palm tree beach")).toBe(true);
  });

  it("never treats product-hero briefs as place context even with studio wording", () => {
    expect(briefNeedsSceneGeography("studio lighting on a red smoothie")).toBe(false);
    expect(briefNeedsSceneGeography("smoothie on a city patio")).toBe(false);
  });

  it("treats beauty and portrait briefs as non-place (no café brand leak)", () => {
    expect(briefNeedsSceneGeography("natural refreshed woman portrait")).toBe(false);
    expect(briefNeedsSceneGeography("Instagram for Aurora Medical Spa beauty close-up")).toBe(
      false,
    );
    expect(briefNeedsSceneGeography("wellness portrait high-key")).toBe(false);
    expect(briefNeedsSceneGeography("team photo at our spa")).toBe(true);
  });

  it("detects brand-outcome briefs so compose does not invent product bottles", () => {
    expect(isBrandOutcomeBrief("create an image for Aurora Med Spa")).toBe(true);
    expect(isBrandOutcomeBrief("make an instagram post for Aurora Medical Spa Des Peres")).toBe(
      true,
    );
    expect(isBrandOutcomeBrief("Aurora Med Spa")).toBe(true);
    expect(isBrandOutcomeBrief("radiant glowing skin beauty close-up for Aurora Med Spa")).toBe(
      false,
    );
    expect(isBrandOutcomeBrief("Aurora Med Spa skincare bottles flat lay")).toBe(false);
    expect(isBrandOutcomeBrief("vibrant red smoothie")).toBe(false);
  });

  it("detects product-ad briefs (launches, site URLs) separately from brand heroes", () => {
    expect(
      isProductAdBrief(
        "create an image for our new eyelash serum use revitalash.com for brand facts",
      ),
    ).toBe(true);
    expect(isProductAdBrief("launch our new skincare serum instagram post")).toBe(true);
    expect(
      isProductAdBrief(
        "create an instagram post for my company launch The Restaurant Creatives use therestaurantcreatives.com for information and images",
      ),
    ).toBe(false);
    expect(isProductAdBrief("create an image for Aurora Med Spa")).toBe(false);
    expect(isProductAdBrief("eyelash serum bottle flat lay on white")).toBe(false);
  });

  it("uses references when available and brand knowledge when the site has no images", () => {
    expect(
      buildProductAdPrompt("RevitaLash facts", { hasReferenceImages: true }),
    ).toMatch(/using the reference product images/i);
    expect(
      buildProductAdPrompt("RevitaLash facts", { hasReferenceImages: false }),
    ).toMatch(/do not invent packaging/i);
    expect(
      buildProductAdPrompt("RevitaLash facts", { hasReferenceImages: true }),
    ).toMatch(/do not invent statistics/i);
  });

  it("keeps product generation suffixes short and fidelity-first", () => {
    const suffix = generationSuffixForBrief("vibrant red smoothie", false);
    expect(suffix).toMatch(/real photograph/i);
    expect(suffix).toMatch(/only what the brief names|no invented garnish/i);
    expect(suffix).toMatch(/no text|watermark/i);
    expect(suffix.length).toBeLessThan(320);
  });
});
