"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDashboardScheduledPosts } from "@/lib/use-dashboard-scheduled-posts";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";

interface PageInsights {
  name?: string;
  followers_count?: number;
  fan_count?: number;
  picture?: { data: { url: string } };
}

interface FBPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  shares?: { count: number };
}

export default function FacebookPage() {
  const { posts: allPosts } = useDashboardScheduledPosts();
  const posts = allPosts.filter(
    (p) => p.platform === "facebook" || p.platform === "both",
  );
  const [pageData, setPageData] = useState<PageInsights | null>(null);
  const [fbPosts, setFbPosts] = useState<FBPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { meta } = useMetaConnection();

  useEffect(() => {
    const locationId = getStoredActiveLocationId();
    if (!meta?.connected || !locationId) {
      setLoading(false);
      return;
    }
    fetch(`/api/meta/insights?locationId=${encodeURIComponent(locationId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.page) setPageData(data.page);
        if (data?.posts?.data) setFbPosts(data.posts.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [meta?.connected]);

  const scheduled = posts.filter((p) => p.status === "scheduled");
  const published = posts.filter((p) => p.status === "published");

  const totalLikes = fbPosts.reduce((sum, p) => sum + (p.likes?.summary?.total_count || 0), 0);
  const totalComments = fbPosts.reduce((sum, p) => sum + (p.comments?.summary?.total_count || 0), 0);
  const totalShares = fbPosts.reduce((sum, p) => sum + (p.shares?.count || 0), 0);

  const followers = pageData?.followers_count ?? pageData?.fan_count ?? 0;

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2]/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text font-heading">Facebook</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {meta?.connected ? meta.pageName : "Page insights & scheduled posts"}
            </p>
          </div>
        </div>
        <a
          href="https://www.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all self-start"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Open Facebook
        </a>
      </div>

      {!meta?.connected && (
        <div className="rounded-2xl bg-surface border border-border p-8 text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1877F2]/10 mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-text mb-1">Connect Your Facebook Page</h3>
          <p className="text-xs text-text-secondary mb-4">Go to Settings to connect your Facebook page and see live insights</p>
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all">
            Go to Settings
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Followers", value: loading ? "—" : followers.toLocaleString(), color: "accent" },
          { label: "Recent Likes", value: loading ? "—" : totalLikes.toLocaleString(), color: "success" },
          { label: "Comments", value: loading ? "—" : totalComments.toLocaleString(), color: "accent-cyan" },
          { label: "Shares", value: loading ? "—" : totalShares.toLocaleString(), color: "warning" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface border border-border p-5">
            <p className={`text-2xl font-bold text-${stat.color} font-heading`}>{stat.value}</p>
            <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Facebook Posts (live from API) */}
        <div className="rounded-2xl bg-surface border border-border p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-text mb-4">Recent Posts</h3>
          {fbPosts.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">
              {loading ? "Loading..." : meta?.connected ? "No recent posts found" : "Connect Facebook to see posts"}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fbPosts.slice(0, 6).map((post) => (
                <div key={post.id} className="flex gap-3 rounded-xl bg-elevated/50 p-3">
                  {post.full_picture && (
                    <img
                      src={post.full_picture}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text line-clamp-2">{post.message || "Photo post"}</p>
                    <p className="text-[10px] text-text-secondary mt-1">
                      {new Date(post.created_time).toLocaleDateString()}
                    </p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[10px] text-text-secondary">
                        {post.likes?.summary?.total_count || 0} likes
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {post.comments?.summary?.total_count || 0} comments
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text">Scheduled Posts</h3>
            <span className="text-xs text-text-secondary">{scheduled.length} upcoming</span>
          </div>
          {scheduled.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">No scheduled Facebook posts</p>
          ) : (
            <div className="space-y-2">
              {scheduled.slice(0, 8).map((post) => (
                <div key={post.id} className="flex items-center gap-3 rounded-xl bg-elevated/50 p-3">
                  <div className="h-2 w-2 rounded-full shrink-0 bg-success" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{post.templateName}</p>
                    <p className="text-xs text-text-secondary">{post.date} at {post.time}</p>
                  </div>
                  <span className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-success/15 text-success">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text">Published Posts</h3>
            <span className="text-xs text-text-secondary">{published.length} posts</span>
          </div>
          {published.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">No published Facebook posts yet</p>
          ) : (
            <div className="space-y-2">
              {published.slice(0, 8).map((post) => (
                <div key={post.id} className="flex items-center gap-3 rounded-xl bg-elevated/50 p-3">
                  <div className="h-2 w-2 rounded-full shrink-0 bg-accent-cyan" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{post.templateName}</p>
                    <p className="text-xs text-text-secondary">{post.date} at {post.time}</p>
                  </div>
                  <span className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-accent-cyan/15 text-accent-cyan">
                    Published
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
