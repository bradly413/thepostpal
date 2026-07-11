import type { DraftStatus, SocialPlatform } from "@/lib/posterboy-types";
import type { ScheduledPost as LocalScheduledPost } from "@/lib/schedule-store";
import { templates } from "@/lib/templates";

export type CalendarPostPlatform = LocalScheduledPost["platform"];

export interface DashboardScheduledPostRecord {
  id: string;
  organizationId: string;
  locationId: string | null;
  copy: string;
  platforms: SocialPlatform[];
  scheduledFor: string | null;
  status: DraftStatus;
  templateId?: string | null;
  pillar?: string | null;
  note?: string | null;
  reviewerNotes?: string | null;
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  mediaType?: "image" | "video" | null;
  errorLog?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function platformsFromCalendarPlatform(
  platform: CalendarPostPlatform,
): SocialPlatform[] {
  if (platform === "both") return ["facebook", "instagram"];
  return [platform];
}

export function calendarPlatformFromPlatforms(
  platforms: SocialPlatform[],
): CalendarPostPlatform {
  const hasFacebook = platforms.includes("facebook");
  const hasInstagram = platforms.includes("instagram");
  if (hasFacebook && hasInstagram) return "both";
  if (hasFacebook) return "facebook";
  if (hasInstagram) return "instagram";
  return "both";
}

export function scheduledForIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function splitScheduledFor(
  scheduledFor: string | null,
): { date: string; time: string } {
  if (!scheduledFor) {
    return { date: "", time: "09:00" };
  }
  const d = new Date(scheduledFor);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

const LOCAL_STATUS_MAP: Record<DraftStatus, LocalScheduledPost["status"]> = {
  draft: "draft",
  scheduled: "scheduled",
  published: "published",
  approved: "scheduled",
  publishing: "scheduled",
  needs_review: "draft",
  needs_revision: "draft",
  skipped: "draft",
  failed: "failed",
};

export function mapRecordToCalendarPost(
  record: DashboardScheduledPostRecord,
): LocalScheduledPost {
  const { date, time } = splitScheduledFor(record.scheduledFor);
  const templateId = record.templateId || templates[0]?.id || "";
  const tmpl = templates.find((t) => t.id === templateId);
  const localStatus = LOCAL_STATUS_MAP[record.status] ?? "draft";

  return {
    id: record.id,
    templateId,
    templateName: tmpl?.name || "",
    platform: calendarPlatformFromPlatforms(record.platforms),
    date,
    time,
    caption: record.copy,
    status: localStatus,
    pillar: record.pillar || tmpl?.pillar || "",
  };
}

export function mapCalendarPostToCreateInput(
  post: Omit<LocalScheduledPost, "id">,
  locationId: string,
): {
  locationId: string;
  copy: string;
  platforms: SocialPlatform[];
  scheduledFor: string | null;
  status: DraftStatus;
  templateId: string | null;
  pillar: string | null;
} {
  const status: DraftStatus =
    post.status === "published"
      ? "published"
      : post.status === "scheduled"
        ? "scheduled"
        : "draft";

  return {
    locationId,
    copy: post.caption,
    platforms: platformsFromCalendarPlatform(post.platform),
    scheduledFor: post.date ? scheduledForIso(post.date, post.time) : null,
    status,
    templateId: post.templateId || null,
    pillar: post.pillar || null,
  };
}
