"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  fetchDashboardPhotos,
  formatDashboardApiMessage,
  submitDashboardPost,
  updateDashboardPost,
  type DashboardPostRecord,
  type DashboardPhotoRecord,
} from "@/lib/dashboard-api";
import { useActiveLocation } from "@/lib/use-active-location";
import { CORE, MICROCOPY } from "@/lib/posterboy-copy";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { isVideoContentType } from "@/lib/upload-mime";

function formatSchedule(draft: DashboardPostRecord): string {
  if (!draft.scheduledFor) return "Unscheduled";
  const d = new Date(draft.scheduledFor);
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

function isVideoAsset(photo: DashboardPhotoRecord): boolean {
  if (photo.mimeType && isVideoContentType(photo.mimeType)) return true;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(photo.url);
}

export default function DraftsPage() {
  const features = usePlanFeatures();
  const { locationId, loading: locationLoading, error: locationError, setLocationId, refresh: refreshLocations } = useActiveLocation();
  const [drafts, setDrafts] = useState<DashboardPostRecord[]>([]);
  const [media, setMedia] = useState<DashboardPhotoRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!locationId) {
      setDrafts([]);
      setMedia([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [posts, photos] = await Promise.all([
        fetchDashboardPosts(locationId),
        fetchDashboardPhotos(locationId),
      ]);
      setDrafts(
        posts.filter(
          (post) =>
            post.status === "draft" ||
            post.status === "needs_revision" ||
            post.status === "needs_review" ||
            post.status === "failed",
        ),
      );
      setMedia(photos);
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

  async function handleRetry(id: string) {
    try {
      // Straight back to the cron queue — the post was already approved once.
      await updateDashboardPost(id, { status: "approved" });
      showToast("Back in the queue.");
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
      ? "Content"
      : count === 1
        ? "One draft ready for review"
        : `${count} drafts ready for review`
    : count === 0
      ? "Content"
      : count === 1
        ? "One draft ready to schedule"
        : `${count} drafts ready to schedule`;

  const subcopy = features.approvalPipeline
    ? `Uploads and drafts land here. ${CORE.approveLeisure}`
    : "Uploads and draft posts land here. Schedule them when you're ready to publish.";

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
            <section className="mb-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-black">
                    Uploads
                  </h2>
                  <p className="mt-0.5 text-[12px] text-black/45">
                    Images and videos from Schedule, Studio, and Media
                  </p>
                </div>
                <Link
                  href="/dashboard/photos"
                  className="text-[12px] font-semibold text-[#ee2532] hover:underline"
                >
                  Open library
                </Link>
              </div>
              {media.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-black/10 bg-white/50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-black/55">No uploads yet</p>
                  <p className="mt-1 text-[12px] text-black/40">
                    Anything you upload in Schedule or Studio shows up here.
                  </p>
                  <Link href="/dashboard/calendar" className="pb-btn-primary mt-4 inline-flex text-sm">
                    Upload on Schedule
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {media.map((item) => {
                    const video = isVideoAsset(item);
                    return (
                      <Link
                        key={item.id}
                        href="/dashboard/photos"
                        className="group relative aspect-square overflow-hidden rounded-xl bg-[#111] ring-1 ring-black/8 transition-transform hover:-translate-y-0.5"
                        title={item.alt || (video ? "Video" : "Image")}
                      >
                        {video ? (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt={item.alt || "Upload"}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {video && (
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                            Video
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-black">
                    Drafts
                  </h2>
                  <p className="mt-0.5 text-[12px] text-black/45">
                    {features.approvalPipeline
                      ? "Posts waiting for review or retry"
                      : "Posts ready to schedule"}
                  </p>
                </div>
              </div>

              {count > 0 && needsAction && (
                <div className="mb-4 flex flex-wrap gap-2">
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
                  title={features.approvalPipeline ? "Nothing awaiting review" : "No drafts yet"}
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
                        {draft.status === "failed" && draft.errorLog && (
                          <p className="text-xs text-[#c81e2a] mt-1 break-words">{draft.errorLog}</p>
                        )}
                        <div className="mt-2 flex gap-2 items-center flex-wrap">
                          <StatusBadge status={draft.status} />
                          <HumanityBadge text={draft.copy} />
                          {draft.platforms.map((p) => (
                            <span key={p} className="text-[10px] uppercase tracking-wide opacity-50">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="pb-draft-actions">
                        {draft.status === "failed" ? (
                          <button type="button" className="pb-press-btn" onClick={() => void handleRetry(draft.id)}>
                            Retry
                          </button>
                        ) : (draft.status === "draft" || draft.status === "needs_revision") ? (
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
            </section>
          </>
        )}
      </LocationGate>

      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}
