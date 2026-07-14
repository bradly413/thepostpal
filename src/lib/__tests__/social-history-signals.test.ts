import { describe, expect, it } from "vitest";
import {
  analyzeHistorySignals,
  extractHashtags,
  computeMediaMix,
  computePostingCadence,
  type HistoryPost,
} from "@/lib/social-history-signals";

describe("extractHashtags", () => {
  it("ranks unique tags by post frequency", () => {
    const tags = extractHashtags([
      "Sold! #RealEstate #Louisville",
      "Open house today #louisville #OpenHouse",
      "Just listed #RealEstate",
    ]);
    expect(tags.find((t) => t.tag === "#realestate")?.count).toBe(2);
    expect(tags.find((t) => t.tag === "#louisville")?.count).toBe(2);
    expect(tags.slice(0, 2).map((t) => t.tag).sort()).toEqual(["#louisville", "#realestate"]);
  });
});

describe("computePostingCadence", () => {
  it("computes posts/week from dated posts", () => {
    const posts: HistoryPost[] = [
      { id: "1", provider: "instagram", caption: "a", createdAt: "2026-01-01T12:00:00.000Z" },
      { id: "2", provider: "instagram", caption: "b", createdAt: "2026-01-08T12:00:00.000Z" },
      { id: "3", provider: "instagram", caption: "c", createdAt: "2026-01-15T12:00:00.000Z" },
    ];
    const cadence = computePostingCadence(posts);
    expect(cadence.postsPerWeek).toBe(1.5);
    expect(cadence.spanDays).toBe(14);
    expect(cadence.summary).toContain("/week");
  });
});

describe("computeMediaMix", () => {
  it("buckets media types and samples image urls", () => {
    const posts: HistoryPost[] = [
      {
        id: "1",
        provider: "instagram",
        caption: "pic",
        mediaType: "IMAGE",
        mediaUrl: "https://cdn.example/a.jpg",
      },
      { id: "2", provider: "instagram", caption: "reel", mediaType: "REELS" },
      { id: "3", provider: "instagram", caption: "set", mediaType: "CAROUSEL_ALBUM" },
    ];
    const mix = computeMediaMix(posts);
    expect(mix.images).toBe(1);
    expect(mix.video).toBe(1);
    expect(mix.carousels).toBe(1);
    expect(mix.sampleImageUrls).toEqual(["https://cdn.example/a.jpg"]);
    expect(mix.summary).toContain("% images");
  });
});

describe("analyzeHistorySignals", () => {
  it("returns combined signals", () => {
    const signals = analyzeHistorySignals([
      {
        id: "1",
        provider: "facebook",
        caption: "Hello #Cafe #Local",
        createdAt: "2026-02-01T10:00:00.000Z",
        mediaType: "PHOTO",
        mediaUrl: "https://cdn.example/b.jpg",
      },
      {
        id: "2",
        provider: "facebook",
        caption: "Come by #cafe",
        createdAt: "2026-02-08T10:00:00.000Z",
        mediaType: "VIDEO",
      },
    ]);
    expect(signals.topHashtags[0]?.tag).toBe("#cafe");
    expect(signals.cadence.postsAnalyzed).toBe(2);
    expect(signals.mediaMix.total).toBe(2);
  });
});
