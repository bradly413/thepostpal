"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LocationSwitcher from "@/components/LocationSwitcher";
import { ErrorState, NoLocationState, SkeletonText } from "@/components/dashboard/StateViews";
import {
  fetchDashboardPosts,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import {
  countPostsByStatus,
  filterPostsForLocation,
} from "@/lib/dashboard-post-helpers";
import { useActiveLocation } from "@/lib/use-active-location";
import {
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";
import { ANALYTICS } from "@/lib/posterboy-copy";

export default function AnalyticsPage() {
  const router = useRouter();
  const { locationId, loading: locationLoading } = useActiveLocation();
  const [stats, setStats] = useState({
    approved: 0,
    published: 0,
    needsReview: 0,
    consistency: 0,
    draftToApproval: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferredLocationId?: string | null) => {
    const activeLocationId =
      preferredLocationId === undefined ? locationId : preferredLocationId;

    if (!activeLocationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const posts = await fetchDashboardPosts(activeLocationId);
      const scoped = filterPostsForLocation(posts, activeLocationId);
      const counts = countPostsByStatus(posts, activeLocationId);
      const reviewed = scoped.filter((post) => post.status !== "draft").length;
      const approved = counts.approved + counts.scheduled + counts.published;

      setStats({
        approved,
        published: counts.published,
        needsReview: counts.needs_review + counts.needs_revision,
        consistency: scoped.length > 0 ? Math.round((approved / scoped.length) * 100) : 0,
        draftToApproval: reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0,
      });
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load workflow metrics."));
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void load();
    return onStoredActiveLocationChange(() => {
      void load();
    });
  }, [load]);

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>Workflow metrics</h1>
          <p>Draft and approval activity — not Meta reach.</p>
        </div>
        <LocationSwitcher onChange={(id) => void load(id)} />
      </div>

      {locationLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonText key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !locationId ? (
        <NoLocationState onCreate={() => router.push("/dashboard/organization")} />
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonText key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Posts approved", value: stats.approved },
              { label: "Posts published", value: stats.published },
              { label: "Awaiting review", value: stats.needsReview },
              { label: "Consistency", value: `${stats.consistency}%` },
              { label: "Draft-to-approval", value: `${stats.draftToApproval}%` },
              {
                label: "Time saved (est.)",
                value: `${Math.max(1, Math.min(14, stats.approved * 2))} hrs`,
              },
            ].map((m) => (
              <div key={m.label} className="pb-draft-card" style={{ gridTemplateColumns: "1fr" }}>
                <p className="text-xs uppercase tracking-widest opacity-50">{m.label}</p>
                <p className="text-2xl mt-2 font-serif" style={{ fontFamily: "var(--font-instrument-serif)" }}>{m.value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm opacity-60">{ANALYTICS.showedUp}</p>
          <Link href="/dashboard/drafts" className="text-sm underline opacity-70 mt-4 inline-block">
            Review drafts
          </Link>
        </>
      )}
    </div>
  );
}
