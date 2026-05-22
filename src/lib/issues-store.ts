import type { Issue } from "./posterboy-types";
import { getDrafts, getDraftsForLocation } from "./drafts-store";
import { getOrganization, getActiveLocation, seedDemoOrganization } from "./organization-store";

const STORAGE_KEY = "posterboy-issues";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getWeekBounds(date = new Date()): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

export function getIssues(): Issue[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  window.dispatchEvent(new Event("issues-updated"));
}

export function getIssue(id: string): Issue | undefined {
  return getIssues().find((i) => i.id === id);
}

export function createIssue(input: {
  organizationId: string;
  locationId?: string;
  title: string;
  draftIds?: string[];
}): Issue {
  const { start, end } = getWeekBounds();
  const issue: Issue = {
    id: generateId(),
    organizationId: input.organizationId,
    locationId: input.locationId,
    title: input.title,
    weekStart: start,
    weekEnd: end,
    status: "open",
    draftIds: input.draftIds ?? [],
  };
  const issues = getIssues();
  issues.unshift(issue);
  saveIssues(issues);
  return issue;
}

export function linkDraftToIssue(issueId: string, draftId: string): void {
  const issues = getIssues();
  const idx = issues.findIndex((i) => i.id === issueId);
  if (idx === -1) return;
  if (!issues[idx].draftIds.includes(draftId)) {
    issues[idx].draftIds.push(draftId);
    saveIssues(issues);
  }
}

export function getIssueStats(issue: Issue): {
  total: number;
  approved: number;
  scheduled: number;
  needsReview: number;
} {
  const drafts = getDrafts().filter((d) => issue.draftIds.includes(d.id));
  return {
    total: drafts.length,
    approved: drafts.filter((d) => d.status === "approved" || d.status === "published").length,
    scheduled: drafts.filter((d) => d.status === "scheduled").length,
    needsReview: drafts.filter(
      (d) => d.status === "needs_review" || d.status === "needs_revision",
    ).length,
  };
}

export function seedDemoIssues(): void {
  if (getIssues().length > 0) return;
  seedDemoOrganization();
  const org = getOrganization();
  const location = getActiveLocation();
  if (!org || !location) return;

  const draftIds = getDraftsForLocation(location.id).map((d) => d.id);
  createIssue({
    organizationId: org.id,
    locationId: location.id,
    title: `Issue No. ${String(getIssues().length + 14).padStart(3, "0")}`,
    draftIds,
  });
}

export function clearIssues(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
