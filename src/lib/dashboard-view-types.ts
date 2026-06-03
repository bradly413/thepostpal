export type CalendarPostPlatform = "facebook" | "instagram" | "both";

export interface CalendarPostView {
  id: string;
  templateId: string;
  templateName: string;
  platform: CalendarPostPlatform;
  date: string;
  time: string;
  caption: string;
  status: "scheduled" | "published" | "failed" | "draft";
  pillar: string;
}

export interface CalendarEventView {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "personal" | "open-house" | "closing" | "meeting" | "other";
  notes?: string;
}
