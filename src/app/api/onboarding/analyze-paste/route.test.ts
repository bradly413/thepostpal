import { describe, expect, it } from "vitest";
import { splitPastedCaptions } from "./route";

describe("splitPastedCaptions", () => {
  it("splits blank-line blocks into posts", () => {
    const posts = splitPastedCaptions(
      "Open Saturdays 9–2. Walk-ins welcome.\n\nNew facial this week — book ahead.",
    );
    expect(posts).toHaveLength(2);
    expect(posts[0]?.caption).toContain("Open Saturdays");
    expect(posts[1]?.provider).toBe("paste");
  });

  it("falls back to a single block when needed", () => {
    const posts = splitPastedCaptions(
      "We keep it simple. Local, warm, and always glad you're here — come see us downtown this weekend.",
    );
    expect(posts.length).toBeGreaterThanOrEqual(1);
  });
});
