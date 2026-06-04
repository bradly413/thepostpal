import type { DraftStatus } from "@/lib/posterboy-types";
import type { DashboardPostRecord } from "@/lib/dashboard-api";

const EMPTY_COUNTS: Record<DraftStatus, number> = {
  draft: 0,
  needs_review: 0,
  approved: 0,
  scheduled: 0,
  published: 0,
  skipped: 0,
  needs_revision: 0,
  failed: 0,
};

export function filterPostsForLocation(
  posts: DashboardPostRecord[],
  locationId?: string | null,
): DashboardPostRecord[] {
  if (!locationId) return posts;
  return posts.filter((post) => post.locationId === locationId);
}

export function countPostsByStatus(
  posts: DashboardPostRecord[],
  locationId?: string | null,
): Record<DraftStatus, number> {
  const counts = { ...EMPTY_COUNTS };
  filterPostsForLocation(posts, locationId).forEach((post) => {
    counts[post.status]++;
  });
  return counts;
}

export function filterPostsNeedingReview(
  posts: DashboardPostRecord[],
  locationId?: string | null,
): DashboardPostRecord[] {
  return filterPostsForLocation(posts, locationId).filter(
    (post) => post.status === "needs_review" || post.status === "needs_revision",
  );
}

export function filterPostsDraftQueue(
  posts: DashboardPostRecord[],
  locationId?: string | null,
): DashboardPostRecord[] {
  return filterPostsForLocation(posts, locationId).filter(
    (post) =>
      post.status === "draft" ||
      post.status === "needs_review" ||
      post.status === "needs_revision",
  );
}

export function filterPostsScheduled(
  posts: DashboardPostRecord[],
  locationId?: string | null,
): DashboardPostRecord[] {
  return filterPostsForLocation(posts, locationId).filter(
    (post) =>
      (post.status === "scheduled" || post.status === "approved") && post.scheduledFor,
  );
}

export function countPostsByLocation(
  posts: DashboardPostRecord[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  posts.forEach((post) => {
    if (!post.locationId) return;
    totals[post.locationId] = (totals[post.locationId] ?? 0) + 1;
  });
  return totals;
}

export function postDateKey(scheduledFor: string | null): string | null {
  if (!scheduledFor) return null;
  const d = new Date(scheduledFor);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
