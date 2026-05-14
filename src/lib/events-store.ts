export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "personal" | "open-house" | "closing" | "meeting" | "other";
  notes?: string;
}

const STORAGE_KEY = "postpal-calendar-events";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getCalendarEvents(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addCalendarEvent(event: Omit<CalendarEvent, "id">): CalendarEvent {
  const events = getCalendarEvents();
  const newEvent = { ...event, id: generateId() };
  events.push(newEvent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event("events-updated"));
  return newEvent;
}

export function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): void {
  const events = getCalendarEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx !== -1) {
    events[idx] = { ...events[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    window.dispatchEvent(new Event("events-updated"));
  }
}

export function deleteCalendarEvent(id: string): void {
  const events = getCalendarEvents().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event("events-updated"));
}

export function getEventsForDate(date: string): CalendarEvent[] {
  return getCalendarEvents().filter((e) => e.date === date);
}
