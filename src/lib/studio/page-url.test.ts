import { describe, expect, it } from "vitest";
import {
  extractWebsiteUrl,
  looksLikeWebsiteBrief,
  normalizeWebsiteUrl,
} from "./page-url";

describe("extractWebsiteUrl", () => {
  it("pulls bare domain from Bruce-style prompt", () => {
    expect(
      extractWebsiteUrl(
        "can you create images for my website here is the link socelle.com",
      ),
    ).toBe("https://socelle.com/");
  });

  it("normalizes https page urls", () => {
    expect(extractWebsiteUrl("brand from https://www.socelle.com/about")).toBe(
      "https://www.socelle.com/about",
    );
  });

  it("skips direct image urls", () => {
    expect(
      extractWebsiteUrl("use https://cdn.example.com/hero.jpg for the post"),
    ).toBeNull();
  });

  it("prefers page url when image and domain both present", () => {
    expect(
      extractWebsiteUrl(
        "site socelle.com photo https://cdn.example.com/a.jpg",
      ),
    ).toBe("https://socelle.com/");
  });
});

describe("normalizeWebsiteUrl", () => {
  it("upgrades http to https", () => {
    expect(normalizeWebsiteUrl("http://socelle.com")).toBe("https://socelle.com/");
  });

  it("rejects email-like strings", () => {
    expect(normalizeWebsiteUrl("hello@socelle.com")).toBeNull();
  });
});

describe("looksLikeWebsiteBrief", () => {
  it("flags website outcome language", () => {
    expect(looksLikeWebsiteBrief("create images for my website")).toBe(true);
    expect(looksLikeWebsiteBrief("bright latte art overhead")).toBe(false);
  });
});
