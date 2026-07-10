import { describe, expect, it } from "vitest";
import type { DashboardPostRecord } from "@/lib/dashboard-api";
import {
  filterFutureQueuedPosts,
  filterPostsScheduled,
  isCalendarPostQueued,
  isQueuedToPublishPost,
} from "@/lib/dashboard-post-helpers";

function post(
  overrides: Partial<DashboardPostRecord> & Pick<DashboardPostRecord, "id" | "status">,
): DashboardPostRecord {
  return {
    organizationId: "org-1",
    locationId: "loc-1",
    copy: "caption",
    platforms: ["instagram"],
    scheduledFor: null,
    templateId: null,
    pillar: null,
    note: null,
    reviewerNotes: null,
    mediaUrl: null,
    mediaUrls: null,
    mediaType: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard-post-helpers", () => {
  it("treats approved and scheduled rows with a schedule as queued", () => {
    expect(
      isQueuedToPublishPost(
        post({ id: "a", status: "approved", scheduledFor: "2026-08-01T12:00:00.000Z" }),
      ),
    ).toBe(true);
    expect(
      isQueuedToPublishPost(
        post({ id: "b", status: "scheduled", scheduledFor: "2026-08-01T12:00:00.000Z" }),
      ),
    ).toBe(true);
    expect(isQueuedToPublishPost(post({ id: "c", status: "published", scheduledFor: "2026-08-01T12:00:00.000Z" }))).toBe(
      false,
    );
  });

  it("filters future queued posts for notifications", () => {
    const rows = [
      post({ id: "past", status: "approved", scheduledFor: "2020-01-01T12:00:00.000Z" }),
      post({ id: "future", status: "approved", scheduledFor: "2099-01-01T12:00:00.000Z" }),
      post({ id: "draft", status: "draft", scheduledFor: "2099-01-01T12:00:00.000Z" }),
    ];

    expect(filterPostsScheduled(rows)).toHaveLength(2);
    expect(filterFutureQueuedPosts(rows, null, "2026-07-10")).toHaveLength(1);
    expect(filterFutureQueuedPosts(rows, null, "2026-07-10")[0]?.id).toBe("future");
  });

  it("recognizes mapped calendar rows as queued", () => {
    expect(isCalendarPostQueued({ status: "scheduled", date: "2026-08-01" })).toBe(true);
    expect(isCalendarPostQueued({ status: "draft", date: "2026-08-01" })).toBe(false);
  });
});
