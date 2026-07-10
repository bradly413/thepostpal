// Type-only module. Calendar events are served by the DB-backed API
// (fetchDashboardCalendar / createDashboardCalendarEvent in @/lib/dashboard-api);
// the old localStorage store + its `events-updated` event were dead (no callers)
// and have been removed. This interface is the UI-facing event shape.
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "personal" | "open-house" | "closing" | "meeting" | "other";
  notes?: string;
}
