import { describe, expect, it } from "vitest";
import {
  extractReferenceImageUrl,
  looksLikeStandaloneImageUrl,
} from "./reference-url";

describe("extractReferenceImageUrl", () => {
  it("pulls a jpeg CDN url out of a listing brief", () => {
    const url = extractReferenceImageUrl(
      "new listing https://cdn.example.com/photos/223-victor.jpg?w=1200 please enhance",
    );
    expect(url).toBe("https://cdn.example.com/photos/223-victor.jpg?w=1200");
  });

  it("prefers image extension when multiple urls exist", () => {
    const url = extractReferenceImageUrl(
      "see https://www.zillow.com/homedetails/123 and photo https://photos.zillowstatic.com/fp/abc.webp",
    );
    expect(url).toBe("https://photos.zillowstatic.com/fp/abc.webp");
  });

  it("strips trailing punctuation", () => {
    expect(extractReferenceImageUrl("look https://img.example.com/a.png.")).toBe(
      "https://img.example.com/a.png",
    );
  });

  it("returns null when no https url", () => {
    expect(extractReferenceImageUrl("make a post about tacos")).toBeNull();
  });
});

describe("looksLikeStandaloneImageUrl", () => {
  it("accepts a bare https image url", () => {
    expect(
      looksLikeStandaloneImageUrl("https://dugdppfv1e8wf.cloudfront.net/uploads/x.jpg"),
    ).toBe(true);
  });

  it("rejects mixed prose", () => {
    expect(
      looksLikeStandaloneImageUrl("enhance this https://cdn.example.com/a.jpg please"),
    ).toBe(false);
  });
});
