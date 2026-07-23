import { describe, expect, it } from "vitest";
import { parseSiteIntel } from "@/lib/studio/site-intel";
import { extractImageCandidates, extractReadableText } from "@/lib/studio/open-graph";

const ALLOWED = new Set([
  "https://example.com/serum-bottle.jpg",
  "https://example.com/hero.jpg",
]);

describe("parseSiteIntel", () => {
  it("keeps facts, brand, and an allowed best image", () => {
    const intel = parseSiteIntel(
      JSON.stringify({
        brandName: "RevitaLash",
        facts: ["Clinically measured results in 6 weeks", "Ophthalmologist reviewed"],
        bestImageUrl: "https://example.com/serum-bottle.jpg",
      }),
      ALLOWED,
    );
    expect(intel).not.toBeNull();
    expect(intel!.brandName).toBe("RevitaLash");
    expect(intel!.facts).toHaveLength(2);
    expect(intel!.bestImageUrl).toBe("https://example.com/serum-bottle.jpg");
  });

  it("rejects a bestImageUrl the page never listed (no model-invented URLs)", () => {
    const intel = parseSiteIntel(
      JSON.stringify({
        facts: [],
        bestImageUrl: "https://evil.example.com/whatever.jpg",
      }),
      ALLOWED,
    );
    expect(intel!.bestImageUrl).toBeNull();
  });

  it("caps facts at 5 and returns null on garbage", () => {
    const intel = parseSiteIntel(
      JSON.stringify({ facts: ["a", "b", "c", "d", "e", "f", "g"] }),
      ALLOWED,
    );
    expect(intel!.facts).toHaveLength(5);
    expect(parseSiteIntel("not json", ALLOWED)).toBeNull();
  });
});

describe("extractReadableText", () => {
  it("strips scripts, styles, and tags", () => {
    const text = extractReadableText(
      `<html><head><style>.x{color:red}</style><script>alert(1)</script></head>
       <body><h1>RevitaLash Advanced</h1><p>Results in &amp; around 6 weeks.</p></body></html>`,
    );
    expect(text).toContain("RevitaLash Advanced");
    expect(text).toContain("Results in & around 6 weeks.");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
  });
});

describe("extractImageCandidates", () => {
  it("resolves relative URLs, keeps alt, skips svg/favicon/dupes", () => {
    const imgs = extractImageCandidates(
      `<img src="/img/serum.jpg" alt="RevitaLash serum bottle">
       <img src="/img/serum.jpg" alt="dupe">
       <img src="/icons/favicon.png">
       <img src="/brand/logo.svg">
       <img srcset="https://cdn.example.com/hero-800.jpg 800w, https://cdn.example.com/hero-1600.jpg 1600w">`,
      "https://example.com/products/serum",
    );
    const urls = imgs.map((i) => i.url);
    expect(urls).toContain("https://example.com/img/serum.jpg");
    expect(urls).toContain("https://cdn.example.com/hero-800.jpg");
    expect(urls.filter((u) => u.includes("serum.jpg"))).toHaveLength(1);
    expect(urls.some((u) => u.includes("favicon"))).toBe(false);
    expect(urls.some((u) => u.endsWith(".svg"))).toBe(false);
    expect(imgs.find((i) => i.url.includes("serum.jpg"))!.alt).toBe("RevitaLash serum bottle");
  });
});
