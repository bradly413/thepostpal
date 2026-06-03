"use client";

import { useCallback, useEffect, useState } from "react";
import "@/styles/dashboard-bento.css";
import BentoMenu from "./BentoMenu";
import BentoHero from "./BentoHero";
import BentoStats from "./BentoStats";
import BentoAiStudio from "./BentoAiStudio";
import BentoWeekProgress from "./BentoWeekProgress";
import BentoBrandTiles from "./BentoBrandTiles";
import {
  fetchDashboardLocations,
  fetchDashboardPosts,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import {
  countPostsByStatus,
  filterPostsNeedingReview,
  filterPostsScheduled,
} from "@/lib/dashboard-post-helpers";
import { getIssues, seedDemoIssues } from "@/lib/issues-store";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";

type BentoSnapshot = {
  businessName: string;
  locationLabel: string;
  counts: { dispatch: number; issues: number; drafts: number };
  draftTotal: number;
  pendingReview: number;
  approvedCount: number;
  totalThisWeek: number;
  nextLabel?: string;
};

export default function DashboardBento() {
  const [data, setData] = useState<BentoSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const locationId = getStoredActiveLocationId();
      const [locations, posts] = await Promise.all([
        fetchDashboardLocations(),
        fetchDashboardPosts(locationId),
      ]);

      const loc =
        locations.find((entry) => entry.id === locationId) ?? locations[0];
      const counts = countPostsByStatus(posts, loc?.id);
      const pending = filterPostsNeedingReview(posts, loc?.id);
      const scheduled = filterPostsScheduled(posts, loc?.id);
      const issues = getIssues().filter(
        (issue) => !loc?.id || issue.locationId === loc.id,
      );

      const next = pending[0] ?? scheduled[0];
      const nextLabel = next
        ? next.copy.length > 48
          ? `${next.copy.slice(0, 48)}…`
          : next.copy
        : undefined;

      setData({
        businessName: loc?.name ?? "Your business",
        locationLabel: loc ? `${loc.name} · workspace` : "One location",
        counts: {
          dispatch: scheduled.length + counts.approved,
          issues: issues.filter((issue) => issue.status === "open").length,
          drafts: pending.length + counts.draft + counts.needs_revision,
        },
        draftTotal: Object.values(counts).reduce((sum, value) => sum + value, 0),
        pendingReview: pending.length + counts.draft + counts.needs_revision,
        approvedCount: counts.approved + counts.scheduled,
        totalThisWeek:
          pending.length +
          counts.approved +
          counts.scheduled +
          counts.published,
        nextLabel,
      });
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load your week."));
      setData(null);
    }
  }, []);

  useEffect(() => {
    seedDemoIssues();
    void refresh();
    return onStoredActiveLocationChange(() => {
      void refresh();
    });
  }, [refresh]);

  if (error) {
    return (
      <div className="dbento dbento-stage">
        <p className="dbento-meta">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dbento dbento-stage">
        <p className="dbento-meta">Loading your week…</p>
      </div>
    );
  }

  const weekLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="dbento">
      <div className="dbento-stage">
        <header className="dbento-topbar">
          <span className="dbento-brand">
            poster<b>boy</b>
          </span>
          <span className="dbento-meta">This week · {weekLabel}</span>
        </header>

        <div className="dbento-grid">
          <div className="dbento-row dbento-row-top">
            <BentoMenu
              businessName={data.businessName}
              locationLabel={data.locationLabel}
              counts={data.counts}
            />
            <BentoHero pendingCount={data.pendingReview} nextLabel={data.nextLabel} />
            <BentoStats draftTotal={data.draftTotal} pendingReview={data.pendingReview} />
          </div>

          <div className="dbento-row dbento-row-bot">
            <BentoAiStudio />
            <BentoWeekProgress
              approvedCount={data.approvedCount}
              totalThisWeek={data.totalThisWeek}
            />
            <BentoBrandTiles />
          </div>
        </div>
      </div>
    </div>
  );
}
