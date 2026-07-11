import type { DraftStatus } from "@/lib/posterboy-types";
import type { DashboardPostRecord } from "@/lib/dashboard-api";

/** DB statuses that are waiting on the publish dispatcher. */
export function isQueuedToPublishStatus(status: DraftStatus): boolean {
  return status === "scheduled" || status === "approved" || status === "publishing";
}

export function isQueuedToPublishPost(post: Pick<DashboardPostRecord, "status" | "scheduledFor">): boolean {
  return Boolean(post.scheduledFor) && isQueuedToPublishStatus(post.status);
}

const EMPTY_COUNTS: Record<DraftStatus, number> = {
  draft: 0,
  needs_review: 0,
  approved: 0,
  scheduled: 0,
  published: 0,
  publishing: 0,
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
  return filterPostsForLocation(posts, locationId).filter(isQueuedToPublishPost);
}

/** Queued posts with a schedule at or after the start of today (local). */
export function filterFutureQueuedPosts(
  posts: DashboardPostRecord[],
  locationId?: string | null,
  todayKey = todayDateKeyLocal(),
): DashboardPostRecord[] {
  return filterPostsScheduled(posts, locationId).filter((post) => {
    const key = postDateKey(post.scheduledFor);
    return key !== null && key >= todayKey;
  });
}

export function todayDateKeyLocal(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Calendar grid uses mapped local status; approved rows surface as "scheduled". */
export function isCalendarPostQueued(post: {
  status: string;
  date: string;
}): boolean {
  return post.status === "scheduled" && Boolean(post.date);
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

/** Monday-start week date keys in the viewer's local timezone. */
export function getWeekDateKeysLocal(date = new Date()): string[] {
  const day = date.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) =>
    todayDateKeyLocal(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)),
  );
}

const WEEKLY_OVERVIEW_STATUSES: DraftStatus[] = ["scheduled", "approved", "publishing", "published"];

/** Local calendar day used for the home "Posts This Week" module. */
export function postOverviewDateKey(
  post: Pick<DashboardPostRecord, "scheduledFor" | "status" | "updatedAt">,
): string | null {
  const scheduled = postDateKey(post.scheduledFor);
  if (scheduled) return scheduled;
  if (post.status === "published") return postDateKey(post.updatedAt);
  return null;
}

export interface DashboardWeeklyOverview {
  rangeLabel: string;
  barHeights: number[];
  /** raw posts-per-day (Monday-start, local) — barHeights has a visual floor */
  dayCounts: number[];
  activeBarIndex: number;
  postsCount: number;
  engagementLabel: string;
  engagementPositive: boolean;
}

function formatWeekRange(weekDates: string[]): string {
  const start = new Date(`${weekDates[0]}T12:00:00`);
  const end = new Date(`${weekDates[6]}T12:00:00`);
  const fmt = (x: Date) => x.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function countPostsOnDate(posts: DashboardPostRecord[], date: string): number {
  return posts.filter((post) => {
    if (!WEEKLY_OVERVIEW_STATUSES.includes(post.status)) return false;
    return postOverviewDateKey(post) === date;
  }).length;
}

export function buildWeeklyOverview(
  posts: DashboardPostRecord[],
  now = new Date(),
): DashboardWeeklyOverview {
  const weekDates = getWeekDateKeysLocal(now);
  const countsPerDay = weekDates.map((date) => countPostsOnDate(posts, date));
  const postsCount = countsPerDay.reduce((sum, c) => sum + c, 0);
  const max = Math.max(1, ...countsPerDay);
  const barHeights =
    postsCount === 0
      ? countsPerDay.map(() => 0)
      : countsPerDay.map((c) =>
          c === 0 ? 26 : Math.max(30, Math.round((c / max) * 100)),
        );
  const peak = Math.max(...countsPerDay);
  const todayIdx = (now.getDay() + 6) % 7;
  const activeBarIndex = peak > 0 ? countsPerDay.indexOf(peak) : todayIdx;

  const prevMon = new Date(`${weekDates[0]}T12:00:00`);
  prevMon.setDate(prevMon.getDate() - 7);
  const prevWeekDates = getWeekDateKeysLocal(prevMon);
  const prevCount = prevWeekDates.reduce(
    (sum, date) => sum + countPostsOnDate(posts, date),
    0,
  );

  let engagementLabel = postsCount === 0 ? "Nothing scheduled" : "—";
  let engagementPositive = false;
  if (prevCount > 0 && postsCount !== prevCount) {
    const pct = Math.round(((postsCount - prevCount) / prevCount) * 100);
    engagementLabel = `${pct > 0 ? "+" : ""}${pct}%`;
    engagementPositive = pct > 0;
  } else if (postsCount > 0 && prevCount === 0) {
    engagementLabel = "New";
    engagementPositive = true;
  } else if (postsCount > 0 && postsCount === prevCount) {
    engagementLabel = "Steady";
    engagementPositive = true;
  }

  return {
    rangeLabel: formatWeekRange(weekDates),
    barHeights,
    dayCounts: countsPerDay,
    activeBarIndex,
    postsCount,
    engagementLabel,
    engagementPositive,
  };
}
