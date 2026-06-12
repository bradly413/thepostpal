import {
  legacyToneFromBrandVoiceJson,
  parseLocationBrandDocument,
} from "@/lib/brand-book-document";
import {
  fetchDashboardLocations,
  fetchDashboardPosts,
  type DashboardLocationRecord,
  type DashboardPostRecord,
} from "@/lib/dashboard-api";
import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import type { DraftStatus } from "@/lib/posterboy-types";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6a3?auto=format&fit=crop&w=900&q=80",
];

export interface DashboardWeeklyOverview {
  rangeLabel: string;
  barHeights: number[];
  /** raw posts-per-day (Monday-start) — barHeights has a visual floor */
  dayCounts: number[];
  activeBarIndex: number;
  postsCount: number;
  engagementLabel: string;
  engagementPositive: boolean;
}

export interface DashboardHomeSnapshot {
  userName: string;
  userRole: string;
  userInitials: string;
  brandVoiceLine: string;
  brandVoiceSub: string;
  nextUp: DashboardPostRecord | null;
  nextUpImage: string | null;
  recentPosts: DashboardPostRecord[];
  pendingCount: number;
  scheduledCount: number;
  hoursSaved: number;
  everythingInSync: boolean;
  weeklyOverview: DashboardWeeklyOverview;
}

const OVERVIEW_STATUSES: DraftStatus[] = ["scheduled", "approved", "published"];

function getWeekDateStrings(): string[] {
  const d = new Date();
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mon);
    date.setDate(mon.getDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

function formatWeekRange(weekDates: string[]): string {
  const start = new Date(`${weekDates[0]}T12:00:00`);
  const end = new Date(`${weekDates[6]}T12:00:00`);
  const fmt = (x: Date) => x.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function countPostsOnDate(posts: DashboardPostRecord[], date: string): number {
  return posts.filter(
    (d) => d.scheduledFor?.slice(0, 10) === date && OVERVIEW_STATUSES.includes(d.status),
  ).length;
}

function buildWeeklyOverview(posts: DashboardPostRecord[]): DashboardWeeklyOverview {
  const weekDates = getWeekDateStrings();
  const countsPerDay = weekDates.map((date) => countPostsOnDate(posts, date));
  const max = Math.max(1, ...countsPerDay);
  const barHeights = countsPerDay.map((c) =>
    c === 0 ? 26 : Math.max(30, Math.round((c / max) * 100)),
  );
  const peak = Math.max(...countsPerDay);
  const activeBarIndex = peak > 0 ? countsPerDay.indexOf(peak) : new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const postsCount = countsPerDay.reduce((sum, c) => sum + c, 0);

  const prevMon = new Date(`${weekDates[0]}T12:00:00`);
  prevMon.setDate(prevMon.getDate() - 7);
  const prevWeekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(prevMon);
    date.setDate(prevMon.getDate() + i);
    return date.toISOString().slice(0, 10);
  });
  const prevCount = prevWeekDates.reduce((sum, date) => sum + countPostsOnDate(posts, date), 0);

  let engagementLabel = "—";
  let engagementPositive = false;
  if (prevCount > 0 && postsCount !== prevCount) {
    const pct = Math.round(((postsCount - prevCount) / prevCount) * 100);
    engagementLabel = `${pct > 0 ? "+" : ""}${pct}%`;
    engagementPositive = pct > 0;
  } else if (postsCount > 0 && prevCount === 0) {
    engagementLabel = "New";
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

function formatScheduleLabel(draft: DashboardPostRecord): string {
  if (!draft.scheduledFor) return "Unscheduled";
  const d = new Date(draft.scheduledFor);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Scheduled for ${date} at ${time}`;
}

function formatShortDate(draft: DashboardPostRecord): string {
  if (!draft.scheduledFor) return "Recently";
  const d = new Date(draft.scheduledFor);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function countByStatus(posts: DashboardPostRecord[]): Record<DraftStatus, number> {
  return posts.reduce<Record<DraftStatus, number>>(
    (acc, post) => {
      acc[post.status] += 1;
      return acc;
    },
    {
      draft: 0,
      needs_review: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
      skipped: 0,
      needs_revision: 0,
      failed: 0,
    },
  );
}

function pickCurrentLocation(locations: DashboardLocationRecord[]): DashboardLocationRecord | null {
  const stored = getStoredActiveLocationId();
  if (stored) {
    const match = locations.find((location) => location.id === stored);
    if (match) return match;
  }
  return locations[0] ?? null;
}

function readStoredUser(): { firstName?: string; lastName?: string; accountName?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("postpal-user");
    return raw ? JSON.parse(raw) as { firstName?: string; lastName?: string; accountName?: string } : null;
  } catch {
    return null;
  }
}

export async function loadDashboardHomeSnapshot(): Promise<DashboardHomeSnapshot> {
  const [locations, posts] = await Promise.all([
    fetchDashboardLocations(),
    fetchDashboardPosts(),
  ]);

  const currentLocation = pickCurrentLocation(locations);
  const scopedPosts = currentLocation
    ? posts.filter((post) => post.locationId === currentLocation.id)
    : posts;
  const counts = countByStatus(scopedPosts);
  const pending = scopedPosts.filter((post) => post.status === "needs_review" || post.status === "needs_revision");
  const scheduled = scopedPosts.filter(
    (post) => (post.status === "scheduled" || post.status === "approved") && post.scheduledFor,
  );
  const approved = scopedPosts.filter((post) => post.status === "approved");
  const published = scopedPosts.filter((post) => post.status === "published");

  const nextUp = scheduled[0] ?? approved[0] ?? pending[0] ?? null;

  const recentPosts =
    published.length > 0
      ? published.slice(0, 3)
      : [...approved, ...scheduled]
          .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
          .slice(0, 3);

  const brandDoc = parseLocationBrandDocument(currentLocation?.brandVoiceJson);
  const toneParts =
    brandDoc?.brandBook.voice?.traits?.map((t) => t.name) ??
    legacyToneFromBrandVoiceJson(currentLocation?.brandVoiceJson);
  const brandVoiceLine =
    toneParts.length > 0
      ? toneParts.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(". ") + "."
      : "Confident. Local. Human.";

  const totalHandled = counts.approved + counts.scheduled + counts.published;
  // Honest, defensible estimate: ~15 min saved per post Posterboy actually
  // handled (created/scheduled/published) — tied to real counts, not invented.
  const hoursSaved = Math.round(totalHandled * 0.25);
  const storedUser = readStoredUser();
  const userName =
    storedUser?.accountName ??
    currentLocation?.name ??
    "Your workspace";
  const userRole = currentLocation ? "Workspace" : "Owner";

  return {
    userName,
    userRole,
    userInitials: userName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    brandVoiceLine,
    brandVoiceSub: "Your voice. Your neighborhood. Your expertise.",
    nextUp,
    // The actual next post's media — null when it has none (no stock filler).
    nextUpImage: nextUp?.mediaUrl ?? nextUp?.mediaUrls?.[0] ?? null,
    recentPosts,
    pendingCount: pending.length,
    scheduledCount: scheduled.length,
    hoursSaved,
    everythingInSync: pending.length === 0,
    weeklyOverview: buildWeeklyOverview(scopedPosts),
  };
}

export { formatScheduleLabel, formatShortDate, HERO_IMAGES };
