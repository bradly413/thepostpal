import { describe, expect, it } from "vitest";
import type { DashboardPostRecord } from "@/lib/dashboard-api";
import {
  buildWeeklyOverview,
  filterFutureQueuedPosts,
  filterPostsScheduled,
  getWeekDateKeysLocal,
  isCalendarPostQueued,
  isQueuedToPublishPost,
  postOverviewDateKey,
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

  it("counts posts on local calendar days for the home weekly module", () => {
    const now = new Date(2026, 6, 11, 12, 0, 0); // Saturday Jul 11, 2026 (local)
    expect(getWeekDateKeysLocal(now)).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
    ]);

    const eveningLocal = post({
      id: "local-evening",
      status: "scheduled",
      scheduledFor: "2026-07-11T03:30:00.000Z",
    });
    expect(postOverviewDateKey(eveningLocal)).toBe("2026-07-10");

    const overview = buildWeeklyOverview(
      [
        eveningLocal,
        post({
          id: "sat",
          status: "published",
          scheduledFor: "2026-07-11T18:00:00.000Z",
        }),
      ],
      now,
    );
    expect(overview.postsCount).toBe(2);
    expect(overview.dayCounts[4]).toBe(1);
    expect(overview.dayCounts[5]).toBe(1);
    expect(overview.engagementLabel).not.toBe("—");
  });

  it("labels an empty week honestly", () => {
    const overview = buildWeeklyOverview([], new Date(2026, 6, 11, 12, 0, 0));
    expect(overview.postsCount).toBe(0);
    expect(overview.engagementLabel).toBe("Nothing scheduled");
    expect(overview.barHeights.every((h) => h === 0)).toBe(true);
  });
});
