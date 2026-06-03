import type { DraftStatus } from "./posterboy-types";

const VALID_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  draft: ["needs_review", "skipped"],
  needs_review: ["approved", "needs_revision", "skipped"],
  approved: ["scheduled", "published"],
  scheduled: ["published", "needs_revision"],
  published: [],
  skipped: ["needs_review"],
  needs_revision: ["needs_review", "draft"],
};

export function canTransition(from: DraftStatus, to: DraftStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
