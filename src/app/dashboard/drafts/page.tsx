"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  EmptyState,
  ErrorState,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  fetchDashboardPosts,
  formatDashboardApiMessage,
  submitDashboardPost,
  updateDashboardPost,
  type DashboardPostRecord,
} from "@/lib/dashboard-api";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";
import { CORE, MICROCOPY } from "@/lib/posterboy-copy";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";

function formatSchedule(draft: DashboardPostRecord): string {
  if (!draft.scheduledFor) return "Unscheduled";
  const d = new Date(draft.scheduledFor);
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

export default function DraftsPage() {
  const features = usePlanFeatures();
  const [drafts, setDrafts] = useState<DashboardPostRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextLocationId?: string | null) => {
    const activeLocationId = nextLocationId === undefined
      ? getStoredActiveLocationId()
      : nextLocationId;
    setLocationId(activeLocationId ?? undefined);

    try {
      setLoading(true);
      setError(null);
      const posts = await fetchDashboardPosts(activeLocationId);
      setDrafts(
        posts.filter(
          (post) =>
            post.status === "draft" ||
            post.status === "needs_revision" ||
            post.status === "needs_review",
        ),
      );
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load this content queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return onStoredActiveLocationChange(() => {
      void load();
    });
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handlePress(id: string) {
    try {
      if (features.approvalPipeline) {
        await submitDashboardPost(id);
        showToast("Sent to the queue. Quietly.");
      } else {
        // Solo / single-location: no team review — queue for publishing directly.
        // "approved" is the cron's internal publish queue; "scheduled" is
        // reserved for Meta-native scheduling and would never dispatch.
        await updateDashboardPost(id, { status: "approved" });
        showToast("Scheduled. Quietly.");
      }
      await load(locationId ?? null);
    } catch (err) {
      showToast(formatDashboardApiMessage(err, MICROCOPY.error));
    }
  }

  async function handleApproveAll() {
    const eligible = drafts.filter((draft) => draft.status === "draft" || draft.status === "needs_revision");
    if (eligible.length === 0) {
      showToast("Nothing new to send.");
      return;
    }

    try {
      if (features.approvalPipeline) {
        await Promise.all(eligible.map((draft) => submitDashboardPost(draft.id)));
        showToast(`Queued ${eligible.length} ${eligible.length === 1 ? "draft" : "drafts"}.`);
      } else {
        await Promise.all(eligible.map((draft) => updateDashboardPost(draft.id, { status: "approved" })));
        showToast(`Scheduled ${eligible.length} ${eligible.length === 1 ? "post" : "posts"}.`);
      }
      await load(locationId ?? null);
    } catch (err) {
      showToast(formatDashboardApiMessage(err, MICROCOPY.error));
    }
  }

  async function handleSkip(id: string) {
    try {
      await updateDashboardPost(id, { status: "skipped" });
      await load(locationId ?? null);
    } catch (err) {
      showToast(formatDashboardApiMessage(err, MICROCOPY.error));
    }
  }

  const count = drafts.length;
  const headline =
    count === 0
      ? "Nothing awaiting review"
      : count === 1
        ? "One draft ready for review"
        : `${count} drafts ready for review`;

  const needsAction = drafts.some((draft) => draft.status === "draft" || draft.status === "needs_revision");

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{headline}</h1>
          <p>{CORE.weekDrafted}</p>
          <p className="text-sm opacity-70 mt-1">
            Posts and captions land here for your review. {CORE.approveLeisure}
          </p>
        </div>
        {features.multiLocation && (
          <LocationSwitcher value={locationId ?? null} onChange={(id) => void load(id)} />
        )}
      </div>

      {count > 0 && needsAction && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" className="pb-btn-primary text-sm py-2 px-4" onClick={handleApproveAll}>
            {features.approvalPipeline ? "Send all to review" : "Schedule all"}
          </button>
          <Link href="/dashboard/editor" className="pb-btn-secondary text-sm py-2 px-4">
            Send to editor
          </Link>
        </div>
      )}

      {loading && count === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonText key={idx} className="h-32 w-full rounded-[24px]" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => void load(locationId ?? null)}
        />
      ) : count === 0 ? (
        <EmptyState title="Nothing awaiting review" sub={MICROCOPY.emptyDrafts} />
      ) : (
        <div className="pb-draft-list">
          {drafts.map((draft) => (
            <article key={draft.id} className="pb-draft-card">
              <div className="pb-draft-meta">{formatSchedule(draft)}</div>
              <div>
                <p className="pb-draft-copy">{draft.copy}</p>
                <div className="mt-2 flex gap-2 items-center">
                  <StatusBadge status={draft.status} />
                  {draft.platforms.map((p) => (
                    <span key={p} className="text-[10px] uppercase tracking-wide opacity-50">{p}</span>
                  ))}
                </div>
              </div>
              <div className="pb-draft-actions">
                {(draft.status === "draft" || draft.status === "needs_revision") ? (
                  <button type="button" className="pb-press-btn" onClick={() => void handlePress(draft.id)}>
                    {features.approvalPipeline ? "Press" : "Schedule"}
                  </button>
                ) : (
                  <span className="pb-btn-secondary text-sm px-4 py-2 opacity-70">
                    {features.approvalPipeline ? "In review" : "Scheduled"}
                  </span>
                )}
                <Link href={`/dashboard/editor?draft=${draft.id}`}>Edit</Link>
                <button type="button" onClick={() => void handleSkip(draft.id)}>Skip</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}
