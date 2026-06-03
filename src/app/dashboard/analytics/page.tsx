"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  fetchDashboardPosts,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import {
  countPostsByStatus,
  filterPostsForLocation,
} from "@/lib/dashboard-post-helpers";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";
import { ANALYTICS } from "@/lib/posterboy-copy";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    approved: 0,
    published: 0,
    needsReview: 0,
    consistency: 0,
    draftToApproval: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (locationId?: string | null) => {
    const activeLocationId =
      locationId === undefined ? getStoredActiveLocationId() : locationId;

    try {
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
    }
  }, []);

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

      {error && (
        <p className="text-sm text-danger mb-4">{error}</p>
      )}

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
    </div>
  );
}
