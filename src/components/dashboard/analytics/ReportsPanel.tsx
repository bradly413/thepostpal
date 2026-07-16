"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import UpgradeToCommandButton from "@/components/billing/UpgradeToCommandButton";
import { useRouter } from "next/navigation";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlan } from "@/components/dashboard/PlanProvider";
import MetricBarChart from "@/components/dashboard/analytics/MetricBarChart";
import TopPostsList from "@/components/dashboard/analytics/TopPostsList";
import {
  EmptyState,
  ErrorState,
  NoLocationState,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  fetchDashboardMetaInsights,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import type { DashboardMetaInsights } from "@/lib/meta-insights-types";
import { useActiveLocation } from "@/lib/use-active-location";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { onStoredActiveLocationChange } from "@/lib/dashboard-browser-state";

export default function ReportsPanel() {
  const router = useRouter();
  const { features, loading: planLoading } = usePlan();
  const {
    locationId,
    loading: locationLoading,
    error: locationError,
    refresh: refreshLocations,
  } = useActiveLocation();
  const { meta, loading: metaLoading, error: metaConnectionError } = useMetaConnection();

  const [insights, setInsights] = useState<DashboardMetaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (preferredLocationId?: string | null) => {
      const activeLocationId =
        preferredLocationId === undefined ? locationId : preferredLocationId;

      if (!activeLocationId) {
        setInsights(null);
        setLoading(false);
        return;
      }

      if (!meta?.connected) {
        setInsights(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardMetaInsights(activeLocationId);
        setInsights(data);
      } catch (err) {
        setInsights(null);
        setError(formatDashboardApiMessage(err, "Could not load Meta insights."));
      } finally {
        setLoading(false);
      }
    },
    [locationId, meta?.connected],
  );

  useEffect(() => {
    if (!metaLoading) void load();
    return onStoredActiveLocationChange(() => void load());
  }, [load, metaLoading]);

  const busy = planLoading || locationLoading || metaLoading || loading;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h2 className="pb-panel-h !mb-1">Reports</h2>
          <p className="text-sm opacity-65">
            Reach, engagement, and top posts from your connected Meta accounts.
          </p>
        </div>
        {features.multiLocation ? (
          <LocationSwitcher onChange={(id) => void load(id)} />
        ) : null}
      </div>

      {planLoading || locationLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonText key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : locationError ? (
        <ErrorState message={locationError} onRetry={() => void refreshLocations()} />
      ) : !locationId ? (
        <NoLocationState />
      ) : metaConnectionError ? (
        <ErrorState message={metaConnectionError} onRetry={() => window.location.reload()} />
      ) : metaLoading || busy ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonText key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !meta?.connected ? (
        <EmptyState
          title="Meta not connected"
          sub="Connect this location to Facebook in Settings to load insights for the last 28 days."
          action={
            <Link href="/dashboard/settings?tab=account" className="pb-btn-primary text-sm px-4 py-2">
              Connect Meta
            </Link>
          }
        />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !insights ? (
        <EmptyState
          title="No insights yet"
          sub="Meta may need a few days of activity before charts populate."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Impressions (28d)", value: insights.summary.totals.impressions.toLocaleString() },
              { label: "Reach (28d)", value: insights.summary.totals.reach.toLocaleString() },
              { label: "Engagement (28d)", value: insights.summary.totals.engagement.toLocaleString() },
              {
                label: "Followers",
                value: [
                  insights.summary.pageFollowers > 0
                    ? `${insights.summary.pageFollowers.toLocaleString()} FB`
                    : null,
                  insights.summary.igFollowers != null
                    ? `${insights.summary.igFollowers.toLocaleString()} IG`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—",
              },
            ].map((m) => (
              <div key={m.label} className="pb-draft-card" style={{ gridTemplateColumns: "1fr" }}>
                <p className="text-xs uppercase tracking-widest opacity-50">{m.label}</p>
                <p className="text-xl font-semibold mt-2">{m.value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs opacity-45 mb-4">
            {insights.summary.pageName}
            {insights.summary.igUsername ? ` · @${insights.summary.igUsername}` : ""}
            {" · "}
            Last 28 days
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <MetricBarChart title="Reach" points={insights.series.reach} color="#c41e2a" />
            <MetricBarChart title="Impressions" points={insights.series.impressions} color="#1a1a1e" />
            <MetricBarChart title="Engagement" points={insights.series.engagement} color="#1f9d4d" />
            <MetricBarChart title="Follower growth" points={insights.series.followers} color="#4a6fa5" />
          </div>

          <TopPostsList posts={insights.topPosts} />

          {!features.locationRollup ? (
            <p className="text-xs opacity-45 mt-6 flex flex-wrap items-center gap-2">
              <span>Upgrade to Command for multi-location roll-up reports.</span>
              <UpgradeToCommandButton variant="link" label="Upgrade to Command" />
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
