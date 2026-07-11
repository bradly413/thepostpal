import type { DraftStatus } from "./posterboy-types";

const VALID_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  draft: ["needs_review", "skipped"],
  needs_review: ["approved", "needs_revision", "skipped"],
  approved: ["scheduled", "published"],
  scheduled: ["published", "needs_revision"],
  published: [],
  // Server-only mid-flight claim; the cron sweeps stuck rows to "failed".
  publishing: [],
  skipped: ["needs_review"],
  needs_revision: ["needs_review", "draft"],
  failed: ["needs_review", "draft"],
};

export function canTransition(from: DraftStatus, to: DraftStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
