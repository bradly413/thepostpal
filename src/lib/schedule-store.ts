/** Legacy local shape used by calendar UI mappers. Source of truth is the API/DB. */
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
