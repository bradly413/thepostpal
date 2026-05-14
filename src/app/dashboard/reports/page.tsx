"use client";

import { useState, useEffect } from "react";
import { templates } from "@/lib/templates";
import { getScheduledPosts, type ScheduledPost } from "@/lib/schedule-store";

export default function ReportsPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    setPosts(getScheduledPosts());
  }, []);

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
          <p className="text-sm text-text-secondary mt-1">Your content activity at a glance</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-surface border border-border p-1 self-start">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === r ? "bg-elevated text-text" : "text-text-secondary hover:text-text"
              }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Posts", value: filtered.length, color: "accent", icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg> },
          { label: "Scheduled", value: scheduled, color: "success", icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: "Published", value: published, color: "accent-cyan", icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: "Templates", value: templates.length, color: "warning", icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${stat.color}/10 text-${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-text font-heading">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform breakdown */}
        <div className="rounded-2xl bg-surface border border-border p-5">
          <h3 className="text-sm font-bold text-text mb-4">Platform Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-text">Facebook</span>
                <span className="text-xs text-text-secondary">{platformBreakdown.facebook} posts</span>
              </div>
              <div className="h-2 rounded-full bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: filtered.length ? `${(platformBreakdown.facebook / filtered.length) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-text">Instagram</span>
                <span className="text-xs text-text-secondary">{platformBreakdown.instagram} posts</span>
              </div>
              <div className="h-2 rounded-full bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-cyan transition-all duration-500"
                  style={{ width: filtered.length ? `${(platformBreakdown.instagram / filtered.length) * 100}%` : "0%" }}
                />
              </div>
            </div>
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-6">No posts in this time range</p>
          )}
        </div>

        {/* Content pillar breakdown */}
        <div className="rounded-2xl bg-surface border border-border p-5">
          <h3 className="text-sm font-bold text-text mb-4">Content Pillars</h3>
          {Object.keys(pillarBreakdown).length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-6">No pillar data in this time range</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(pillarBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([pillar, count]) => (
                  <div key={pillar}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-text">{pillar}</span>
                      <span className="text-xs text-text-secondary">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-elevated overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pillarColors[pillar] || "bg-accent"} transition-all duration-500`}
                        style={{ width: `${(count / filtered.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl bg-surface border border-border p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-text mb-4">Recent Activity</h3>
          {filtered.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">No activity in this time range</p>
          ) : (
            <div className="space-y-2">
              {filtered
                .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
                .slice(0, 10)
                .map((post) => (
                  <div key={post.id} className="flex items-center gap-3 rounded-xl bg-elevated/50 p-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      post.status === "scheduled" ? "bg-success"
                        : post.status === "published" ? "bg-accent-cyan"
                          : post.status === "draft" ? "bg-warning"
                            : "bg-danger"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">{post.templateName}</p>
                      <p className="text-xs text-text-secondary">{post.date} at {post.time} · {post.platform}</p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      post.status === "scheduled" ? "bg-success/15 text-success"
                        : post.status === "published" ? "bg-accent-cyan/15 text-accent-cyan"
                          : post.status === "draft" ? "bg-warning/15 text-warning"
                            : "bg-danger/15 text-danger"
                    }`}>
                      {post.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
