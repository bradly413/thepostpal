import type { Draft, DraftStatus, SocialPlatform } from "./posterboy-types";
import { canTransition } from "./draft-status";
import { getActiveLocation, seedDemoOrganization } from "./organization-store";

export { canTransition } from "./draft-status";

const STORAGE_KEY = "posterboy-drafts";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getDraftsForLocation(locationId: string): Draft[] {
  return getDrafts().filter((d) => d.locationId === locationId);
}

export function getDraft(id: string): Draft | undefined {
  return getDrafts().find((d) => d.id === id);
}

function saveDrafts(drafts: Draft[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new Event("drafts-updated"));
}

export function updateDraft(id: string, updates: Partial<Draft>): Draft | null {
  const drafts = getDrafts();
  const idx = drafts.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  const next = { ...drafts[idx], ...updates, updatedAt: new Date().toISOString() };
  if (updates.status && !canTransition(drafts[idx].status, updates.status)) {
    return null;
  }
  drafts[idx] = next;
  saveDrafts(drafts);
  return next;
}

export function pressDraft(id: string): Draft | null {
  return updateDraft(id, { status: "approved" });
}

export function approveAllDrafts(locationId?: string): number {
  const drafts = getDrafts();
  let count = 0;
  const updated = drafts.map((d) => {
    if (d.status !== "needs_review") return d;
    if (locationId && d.locationId !== locationId) return d;
    count++;
    return { ...d, status: "approved" as DraftStatus, updatedAt: new Date().toISOString() };
  });
  saveDrafts(updated);
  return count;
}

export function skipDraft(id: string): Draft | null {
  return updateDraft(id, { status: "skipped" });
}

export function requestRevision(id: string, note: string): Draft | null {
  return updateDraft(id, { status: "needs_revision", reviewerNotes: note });
}

export function addDraft(draft: Omit<Draft, "id" | "createdAt" | "updatedAt">): Draft {
  const newDraft: Draft = {
    ...draft,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const drafts = getDrafts();
  drafts.push(newDraft);
  saveDrafts(drafts);
  return newDraft;
}

export function createDraftFromEditor(input: {
  copy: string;
  platforms: SocialPlatform[];
  locationId: string;
  scheduledDate?: string;
  scheduledTime?: string;
}): Draft {
  return addDraft({
    ...input,
    status: "needs_review",
  });
}

export function seedDemoDrafts(): void {
  if (getDrafts().length > 0) return;
  seedDemoOrganization();
  const location = getActiveLocation();
  if (!location) return;

  const samples: Omit<Draft, "id" | "createdAt" | "updatedAt">[] = [
    {
      locationId: location.id,
      copy: "Sourdough's back. Loaves cool by ten. Limit two per household, but you didn't hear it from us.",
      platforms: ["instagram"],
      scheduledDate: nextWeekday(2),
      scheduledTime: "10:00",
      status: "needs_review",
    },
    {
      locationId: location.id,
      copy: "A small window display story. The dog is in it.",
      platforms: ["instagram", "facebook"],
      scheduledDate: nextWeekday(3),
      scheduledTime: "15:30",
      status: "needs_review",
    },
    {
      locationId: location.id,
      copy: "Saturday's cooking class. Two spots left.",
      platforms: ["instagram"],
      scheduledDate: nextWeekday(4),
      scheduledTime: "08:00",
      status: "needs_review",
    },
    {
      locationId: location.id,
      copy: "A note about the new oven. Two sentences. That's enough.",
      platforms: ["facebook"],
      scheduledDate: nextWeekday(5),
      scheduledTime: "12:00",
      status: "needs_review",
    },
    {
      locationId: location.id,
      copy: "Weekend hours: open at seven, closed when the last croissant finds a home.",
      platforms: ["instagram"],
      scheduledDate: nextWeekday(6),
      scheduledTime: "09:00",
      status: "draft",
    },
  ];

  samples.forEach((s) => addDraft(s));
}

function nextWeekday(targetDow: number): string {
  const d = new Date();
  const day = d.getDay();
  let diff = targetDow - day;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function getDraftsByStatus(status: DraftStatus, locationId?: string): Draft[] {
  return getDrafts().filter(
    (d) => d.status === status && (!locationId || d.locationId === locationId),
  );
}

export function getDraftsNeedingReview(locationId?: string): Draft[] {
  return getDrafts().filter(
    (d) =>
      (d.status === "needs_review" || d.status === "needs_revision") &&
      (!locationId || d.locationId === locationId),
  );
}

export function getScheduledDrafts(locationId?: string): Draft[] {
  return getDrafts().filter(
    (d) =>
      (d.status === "scheduled" || d.status === "approved") &&
      d.scheduledDate &&
      (!locationId || d.locationId === locationId),
  );
}

export function scheduleDraft(id: string, date: string, time: string): Draft | null {
  return updateDraft(id, { status: "scheduled", scheduledDate: date, scheduledTime: time });
}

export function countByStatus(locationId?: string): Record<DraftStatus, number> {
  const counts: Record<DraftStatus, number> = {
    draft: 0,
    needs_review: 0,
    approved: 0,
    scheduled: 0,
    published: 0,
    skipped: 0,
    needs_revision: 0,
  };
  getDrafts()
    .filter((d) => !locationId || d.locationId === locationId)
    .forEach((d) => {
      counts[d.status]++;
    });
  return counts;
}

/** For tests — reset store */
export function clearDrafts(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
