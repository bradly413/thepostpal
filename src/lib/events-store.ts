/** Legacy local shape for calendar personal events UI. */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "personal" | "open-house" | "closing" | "meeting" | "other";
  notes?: string;
}
