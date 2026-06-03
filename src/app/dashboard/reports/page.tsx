"use client";

import { useState } from "react";
import { templates } from "@/lib/templates";
import { useDashboardScheduledPosts } from "@/lib/use-dashboard-scheduled-posts";

export default function ReportsPage() {
  const { posts, loading, error } = useDashboardScheduledPosts();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const rangeDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = posts.filter((p) => p.date >= cutoffStr);

  const scheduled = filtered.filter((p) => p.status === "scheduled").length;
  const published = filtered.filter((p) => p.status === "published").length;
  const drafts = filtered.filter((p) => p.status === "draft").length;

  const platformBreakdown = {
    facebook: filtered.filter((p) => p.platform === "facebook" || p.platform === "both").length,
    instagram: filtered.filter((p) => p.platform === "instagram" || p.platform === "both").length,
  };

  const pillarBreakdown: Record<string, number> = {};
  filtered.forEach((p) => {
    pillarBreakdown[p.pillar] = (pillarBreakdown[p.pillar] || 0) + 1;
  });

  const pillarColors: Record<string, string> = {
    "Market Clarity": "bg-accent",
    "Buyer / Seller Tips": "bg-warning",
    "Neighborhood / Lifestyle": "bg-success",
    "Angie Personal": "bg-accent-cyan",
    "Local Life": "bg-accent",
    "Neighborhood Life": "bg-success",
    "Stories / Reels": "bg-warning",
    "Home + Lifestyle": "bg-success",
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Reports</h1>
          <p className="text-sm text-text-secondary mt-1">
            Scheduled and published posts from your workspace.
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as "7d" | "30d" | "90d")}
          className="border border-border px-3 py-2 text-sm bg-bg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading…</p>}
      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-text-secondary">Scheduled</p>
          <p className="text-2xl font-bold mt-1">{scheduled}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-text-secondary">Published</p>
          <p className="text-2xl font-bold mt-1">{published}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-text-secondary">Drafts</p>
          <p className="text-2xl font-bold mt-1">{drafts}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold mb-3">By platform</h2>
          <div className="space-y-2">
            {Object.entries(platformBreakdown).map(([platform, count]) => (
              <div key={platform} className="flex justify-between text-sm">
                <span className="capitalize">{platform}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">By pillar</h2>
          <div className="space-y-2">
            {Object.entries(pillarBreakdown).map(([pillar, count]) => (
              <div key={pillar} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${pillarColors[pillar] || "bg-elevated"}`} />
                <span className="flex-1">{pillar || "Uncategorized"}</span>
                <span>{count}</span>
              </div>
            ))}
            {Object.keys(pillarBreakdown).length === 0 && (
              <p className="text-sm text-text-secondary">No pillar data in this range.</p>
            )}
          </div>
        </section>
      </div>

      <p className="text-xs text-text-secondary mt-8 opacity-60">
        {templates.length} templates available in catalog.
      </p>
    </div>
  );
}
