"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  EmptyState,
  ErrorState,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  fetchDashboardIssues,
  formatDashboardApiMessage,
  type DashboardIssueRecord,
} from "@/lib/dashboard-api";
import { useActiveLocation } from "@/lib/use-active-location";
import { PRODUCT } from "@/lib/posterboy-copy";

export default function IssuesPage() {
  const { locationId, loading: locationLoading } = useActiveLocation();
  const [issues, setIssues] = useState<DashboardIssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchDashboardIssues(locationId);
      setIssues(rows);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load issues."));
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    if (locationLoading) return;
    void load();
  }, [load, locationLoading]);

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{PRODUCT.issues}</h1>
          <p>Weekly post bundles. One issue at a time.</p>
        </div>
        <LocationSwitcher onChange={() => void load()} />
      </div>

      {loading || locationLoading ? (
        <div className="space-y-3">
          <SkeletonText className="h-28 w-full" />
          <SkeletonText className="h-28 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : issues.length === 0 ? (
        <EmptyState
          title="No issues yet"
          sub="The week will arrive when posts are grouped into an issue."
          action={
            <Link href="/dashboard/drafts" className="text-sm underline">
              Open drafts
            </Link>
          }
        />
      ) : (
        <div className="pb-draft-list">
          {issues.map((issue) => (
            <article
              key={issue.id}
              className="pb-draft-card"
              style={{ gridTemplateColumns: "1fr auto" }}
            >
              <div>
                <h2
                  className="font-serif text-lg"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {issue.title}
                </h2>
                <p className="text-sm opacity-60 mt-1">
                  {issue.weekStart} — {issue.weekEnd}
                </p>
                <p className="text-sm mt-3">
                  {issue.stats.total} drafts · {issue.stats.approved} approved ·{" "}
                  {issue.stats.scheduled} scheduled · {issue.stats.needsReview} awaiting review
                </p>
              </div>
              <div className="pb-draft-actions">
                <Link href="/dashboard/drafts" className="pb-press-btn">
                  Review issue
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
