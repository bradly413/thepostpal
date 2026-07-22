import { describe, expect, it } from "vitest";
import {
  enrichIntentWithSiteContext,
  parseOpenGraphHtml,
  resolvePageAssetUrl,
} from "./open-graph";

const SAMPLE = `
<!doctype html>
<html>
<head>
  <title>Fallback Title</title>
  <meta property="og:site_name" content="Socelle" />
  <meta property="og:title" content="Socelle — Med Spa" />
  <meta name="description" content="Luxury aesthetics in St. Louis." />
  <meta property="og:image" content="/images/hero.jpg" />
  <link rel="apple-touch-icon" href="/icon-180.png" />
</head>
</html>
`;

describe("parseOpenGraphHtml", () => {
  it("reads og title description and resolves relative image", () => {
    const meta = parseOpenGraphHtml(SAMPLE, "https://socelle.com/");
    expect(meta.siteName).toBe("Socelle");
    expect(meta.title).toBe("Socelle — Med Spa");
    expect(meta.description).toBe("Luxury aesthetics in St. Louis.");
    expect(meta.imageUrl).toBe("https://socelle.com/images/hero.jpg");
  });

  it("falls back to twitter image and title tag", () => {
    const html = `
      <title>Acme Co</title>
      <meta name="twitter:image" content="https://cdn.example.com/og.webp" />
    `;
    const meta = parseOpenGraphHtml(html, "https://acme.example/");
    expect(meta.title).toBe("Acme Co");
    expect(meta.imageUrl).toBe("https://cdn.example.com/og.webp");
  });
});

describe("resolvePageAssetUrl", () => {
  it("handles protocol-relative urls", () => {
    expect(resolvePageAssetUrl("https://socelle.com", "//cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });
});

describe("enrichIntentWithSiteContext", () => {
  it("appends brand cues under the intent cap", () => {
    const out = enrichIntentWithSiteContext("create images for my website", {
      url: "https://socelle.com/",
      title: "Socelle",
      description: "Luxury aesthetics",
      imageUrl: "https://socelle.com/hero.jpg",
      siteName: "Socelle",
    });
    expect(out).toContain("create images for my website");
    expect(out).toContain("Website brand reference: Socelle");
    expect(out).toContain("Luxury aesthetics");
    expect(out.length).toBeLessThanOrEqual(980);
  });
});
