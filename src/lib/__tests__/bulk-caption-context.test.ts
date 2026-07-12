import { describe, expect, it } from "vitest";
import {
  buildBulkCaptionContext,
  formatCaptionVariant,
  isUsableCaptionImageUrl,
} from "@/lib/bulk-caption-context";

describe("bulk-caption-context", () => {
  it("merges direction, goals, and photo note", () => {
    const ctx = buildBulkCaptionContext({
      batchDirection: "open house Saturday",
      selectedToneIds: ["short", "casual"],
      photoNote: "kitchen shot",
      batchIndex: 1,
      batchTotal: 4,
      priorCaptions: ["first caption here"],
    });
    expect(ctx).toContain("open house Saturday");
    expect(ctx).toContain("kitchen shot");
    expect(ctx).toContain("post 2 of 4");
    expect(ctx).toContain("first caption");
    expect(ctx).toContain("Tone:");
    expect(ctx).toContain("brief");
  });

  it("formats variant with hashtags", () => {
    expect(
      formatCaptionVariant({
        angle: "Warm",
        caption: "hello world",
        hashtags: ["#test", "#demo"],
      }),
    ).toBe("hello world\n\n#test #demo");
  });

  it("accepts http(s) and /uploads image urls", () => {
    expect(isUsableCaptionImageUrl("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isUsableCaptionImageUrl("http://localhost:8240/x.png")).toBe(true);
    expect(isUsableCaptionImageUrl("/uploads/tenant/a.jpg")).toBe(true);
    expect(isUsableCaptionImageUrl(null)).toBe(false);
    expect(isUsableCaptionImageUrl("ftp://nope")).toBe(false);
  });
});
