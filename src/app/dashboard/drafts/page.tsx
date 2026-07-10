"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import HumanityBadge from "@/components/dashboard/HumanityBadge";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  EmptyState,
  ErrorState,
  LocationGate,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  fetchDashboardPosts,
  formatDashboardApiMessage,
  submitDashboardPost,
  updateDashboardPost,
  type DashboardPostRecord,
} from "@/lib/dashboard-api";
import { useActiveLocation } from "@/lib/use-active-location";
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
  const router = useRouter();
  const features = usePlanFeatures();
  const { locationId, loading: locationLoading, error: locationError, setLocationId, refresh: refreshLocations } = useActiveLocation();
  const [drafts, setDrafts] = useState<DashboardPostRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!locationId) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDrafts([]);
      const posts = await fetchDashboardPosts(locationId);
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
  }, [locationId]);

  useEffect(() => {
    if (!locationLoading) void load();
  }, [locationLoading, load]);

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
      await load();
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
      await load();
    } catch (err) {
      showToast(formatDashboardApiMessage(err, MICROCOPY.error));
    }
  }

  async function handleSkip(id: string) {
    try {
      await updateDashboardPost(id, { status: "skipped" });
      await load();
    } catch (err) {
      showToast(formatDashboardApiMessage(err, MICROCOPY.error));
    }
  }

  const count = drafts.length;
  const headline = features.approvalPipeline
    ? count === 0
      ? "Nothing awaiting review"
      : count === 1
        ? "One draft ready for review"
        : `${count} drafts ready for review`
    : count === 0
      ? "Nothing scheduled yet"
      : count === 1
        ? "One draft ready to schedule"
        : `${count} drafts ready to schedule`;

  const subcopy = features.approvalPipeline
    ? `Posts and captions land here for your review. ${CORE.approveLeisure}`
    : "Draft posts land here. Schedule them when you're ready to publish.";

  const needsAction = drafts.some((draft) => draft.status === "draft" || draft.status === "needs_revision");

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{headline}</h1>
          <p>{CORE.weekDrafted}</p>
          <p className="text-sm opacity-70 mt-1">{subcopy}</p>
        </div>
        {features.multiLocation && (
          <LocationSwitcher value={locationId ?? null} onChange={setLocationId} />
        )}
      </div>

      <LocationGate
        loading={locationLoading}
        error={locationError}
        locationId={locationId}
        onRetry={() => void refreshLocations()}
        onCreate={() => router.push("/dashboard/organization")}
        skeleton={
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <SkeletonText key={idx} className="h-32 w-full rounded-[24px]" />
            ))}
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3 opacity-60">
            {Array.from({ length: 3 }).map((_, idx) => (
              <SkeletonText key={idx} className="h-32 w-full rounded-[24px]" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : (
          <>
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

          {count === 0 ? (
            <EmptyState
              title={features.approvalPipeline ? "Nothing awaiting review" : "Nothing scheduled yet"}
              sub={MICROCOPY.emptyDrafts}
              action={
                <a href="/dashboard/studio" className="pb-btn-primary">
                  Create a post
                </a>
              }
            />
          ) : (
            <div className={`pb-draft-list${loading ? " opacity-50 pointer-events-none" : ""}`}>
              {drafts.map((draft) => (
                <article key={draft.id} className="pb-draft-card">
                  <div className="pb-draft-meta">{formatSchedule(draft)}</div>
                  <div>
                    <p className="pb-draft-copy">{draft.copy}</p>
                    <div className="mt-2 flex gap-2 items-center flex-wrap">
                      <StatusBadge status={draft.status} />
                      <HumanityBadge text={draft.copy} />
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
        </>
        )}
      </LocationGate>

      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}
