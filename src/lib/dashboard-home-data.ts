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
import {
  filterFutureQueuedPosts,
  filterPostsForLocation,
  filterPostsNeedingReview,
  isQueuedToPublishPost,
  buildWeeklyOverview,
  type DashboardWeeklyOverview,
} from "@/lib/dashboard-post-helpers";
import type { DraftStatus } from "@/lib/posterboy-types";

export type { DashboardWeeklyOverview } from "@/lib/dashboard-post-helpers";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6a3?auto=format&fit=crop&w=900&q=80",
];

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
      publishing: 0,
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

export async function loadDashboardHomeSnapshot(
  preferredLocationId?: string | null,
): Promise<DashboardHomeSnapshot> {
  const [locations, posts] = await Promise.all([
    fetchDashboardLocations(),
    fetchDashboardPosts(),
  ]);

  const currentLocation =
    (preferredLocationId
      ? locations.find((location) => location.id === preferredLocationId)
      : null) ?? pickCurrentLocation(locations);
  const scopedPosts = filterPostsForLocation(posts, currentLocation?.id);
  const counts = countByStatus(scopedPosts);
  const pending = filterPostsNeedingReview(scopedPosts);
  const queued = scopedPosts.filter(isQueuedToPublishPost);
  const futureQueued = filterFutureQueuedPosts(scopedPosts);
  const approved = scopedPosts.filter((post) => post.status === "approved");
  const published = scopedPosts.filter((post) => post.status === "published");

  const nextUp =
    futureQueued.sort((a, b) =>
      (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""),
    )[0] ??
    approved[0] ??
    pending[0] ??
    null;

  const recentPosts =
    published.length > 0
      ? published.slice(0, 3)
      : [...approved, ...queued]
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
    scheduledCount: futureQueued.length,
    hoursSaved,
    everythingInSync: pending.length === 0,
    weeklyOverview: buildWeeklyOverview(scopedPosts),
  };
}

export { formatScheduleLabel, formatShortDate, HERO_IMAGES };
