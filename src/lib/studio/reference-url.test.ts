import { describe, expect, it } from "vitest";
import {
  extractReferenceImageUrl,
  looksLikeDirectImageUrl,
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

  it("does not treat website pages as image refs", () => {
    expect(extractReferenceImageUrl("https://socelle.com")).toBeNull();
    expect(extractReferenceImageUrl("https://www.socelle.com/")).toBeNull();
    expect(
      extractReferenceImageUrl("create images for https://www.socelle.com/about"),
    ).toBeNull();
  });
});

describe("looksLikeDirectImageUrl", () => {
  it("accepts image extensions and known photo CDNs", () => {
    expect(looksLikeDirectImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(looksLikeDirectImageUrl("https://photos.zillowstatic.com/fp/abc")).toBe(true);
  });

  it("rejects site homepages", () => {
    expect(looksLikeDirectImageUrl("https://socelle.com")).toBe(false);
    expect(looksLikeDirectImageUrl("https://www.socelle.com/")).toBe(false);
  });
});

describe("looksLikeStandaloneImageUrl", () => {
  it("accepts a bare https image url", () => {
    expect(
      looksLikeStandaloneImageUrl("https://dugdppfv1e8wf.cloudfront.net/uploads/x.jpg"),
    ).toBe(true);
  });

  it("rejects website urls and mixed prose", () => {
    expect(looksLikeStandaloneImageUrl("https://socelle.com")).toBe(false);
    expect(
      looksLikeStandaloneImageUrl("enhance this https://cdn.example.com/a.jpg please"),
    ).toBe(false);
  });
});
