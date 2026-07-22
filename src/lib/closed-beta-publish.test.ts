import { describe, expect, it } from "vitest";
import {
  blocksClosedBetaVideoPublish,
  CLOSED_BETA_VIDEO_MESSAGE,
} from "@/lib/closed-beta-publish";

describe("blocksClosedBetaVideoPublish", () => {
  it("blocks video into the cron queue statuses", () => {
    expect(blocksClosedBetaVideoPublish("video", "approved")).toBe(true);
    expect(blocksClosedBetaVideoPublish("video", "scheduled")).toBe(true);
    expect(blocksClosedBetaVideoPublish("video", "publishing")).toBe(true);
  });

  it("allows image queue posts and video drafts", () => {
    expect(blocksClosedBetaVideoPublish("image", "approved")).toBe(false);
    expect(blocksClosedBetaVideoPublish("video", "draft")).toBe(false);
    expect(blocksClosedBetaVideoPublish(null, "approved")).toBe(false);
  });

  it("exports a clear beta message", () => {
    expect(CLOSED_BETA_VIDEO_MESSAGE).toMatch(/closed beta/i);
  });
});
