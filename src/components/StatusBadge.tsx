import type { DraftStatus } from "@/lib/posterboy-types";

const LABELS: Record<DraftStatus, string> = {
  draft: "Draft",
  needs_review: "Needs review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  publishing: "Publishing",
  skipped: "Skipped",
  needs_revision: "Needs revision",
  failed: "Publish failed",
};

interface StatusBadgeProps {
  status: DraftStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`pb-status pb-status-${status.replace("_", "-")}`}>{LABELS[status]}</span>;
}
