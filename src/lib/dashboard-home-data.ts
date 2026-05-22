import {
  countByStatus,
  getDrafts,
  getDraftsByStatus,
  getDraftsNeedingReview,
  getScheduledDrafts,
} from "@/lib/drafts-store";
import { getActiveLocation, getOrganization } from "@/lib/organization-store";
import { seedDemoIssues } from "@/lib/issues-store";
import { ensureDashboardData } from "@/lib/dashboard-data-init";
import type { Draft, DraftStatus } from "@/lib/posterboy-types";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6a3?auto=format&fit=crop&w=900&q=80",
];

export interface DashboardWeeklyOverview {
  rangeLabel: string;
  barHeights: number[];
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
  nextUp: Draft | null;
  nextUpImage: string;
  recentPosts: Draft[];
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

function countDraftsOnDate(drafts: Draft[], date: string): number {
  return drafts.filter(
    (d) => d.scheduledDate === date && OVERVIEW_STATUSES.includes(d.status),
  ).length;
}

function buildWeeklyOverview(locationId?: string): DashboardWeeklyOverview {
  const weekDates = getWeekDateStrings();
  const drafts = getDrafts().filter((d) => !locationId || d.locationId === locationId);
  const countsPerDay = weekDates.map((date) => countDraftsOnDate(drafts, date));
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
  const prevCount = prevWeekDates.reduce((sum, date) => sum + countDraftsOnDate(drafts, date), 0);

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
    activeBarIndex,
    postsCount,
    engagementLabel,
    engagementPositive,
  };
}

function formatScheduleLabel(draft: Draft): string {
  if (!draft.scheduledDate) return "Unscheduled";
  const d = new Date(`${draft.scheduledDate}T12:00:00`);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = draft.scheduledTime ?? "";
  return `Scheduled for ${date}${time ? ` at ${time}` : ""}`;
}

function formatShortDate(draft: Draft): string {
  if (!draft.scheduledDate) return "Recently";
  const d = new Date(`${draft.scheduledDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function loadDashboardHomeSnapshot(): DashboardHomeSnapshot {
  ensureDashboardData();
  seedDemoIssues();

  const loc = getActiveLocation();
  const org = getOrganization();
  const locationId = loc?.id;
  const counts = countByStatus(locationId);
  const pending = getDraftsNeedingReview(locationId);
  const scheduled = getScheduledDrafts(locationId);
  const approved = getDraftsByStatus("approved", locationId);
  const published = getDraftsByStatus("published", locationId);

  const nextUp = scheduled[0] ?? approved[0] ?? pending[0] ?? null;

  const recentPosts =
    published.length > 0
      ? published.slice(0, 3)
      : [...approved, ...scheduled]
          .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
          .slice(0, 3);

  const toneParts = loc?.brandVoice?.tone ?? [];
  const brandVoiceLine =
    toneParts.length > 0
      ? toneParts.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(". ") + "."
      : "Confident. Local. Human.";

  const totalHandled = counts.approved + counts.scheduled + counts.published;
  const hoursSaved = Math.max(1, Math.min(14, totalHandled * 2 + pending.length));

  const userName = org?.name ?? loc?.name ?? "Your business";
  const userRole =
    org?.businessType === "realtor"
      ? "Realtor"
      : org?.businessType
        ? org.businessType.charAt(0).toUpperCase() + org.businessType.slice(1)
        : "Owner";

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
    nextUpImage: HERO_IMAGES[0],
    recentPosts,
    pendingCount: pending.length,
    scheduledCount: scheduled.length,
    hoursSaved,
    everythingInSync: pending.length === 0,
    weeklyOverview: buildWeeklyOverview(locationId),
  };
}

export { formatScheduleLabel, formatShortDate, HERO_IMAGES };
