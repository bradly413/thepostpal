// Type-only module. The scheduled-post data layer is the DB-backed API
// (fetchDashboardPosts / createDashboardPost in @/lib/dashboard-api); the old
// localStorage store + its `schedule-updated` event were dead (no callers) and
// have been removed. This interface is the UI-facing shape that
// scheduled-post-mappers maps API records into.
export interface ScheduledPost {
  id: string;
  templateId: string;
  templateName: string;
  platform: "facebook" | "instagram" | "both";
  date: string;
  time: string;
  caption: string;
  status: "scheduled" | "published" | "failed" | "draft";
  pillar: string;
}
