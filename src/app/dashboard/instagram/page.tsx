"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDashboardScheduledPosts } from "@/lib/use-dashboard-scheduled-posts";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";

interface IGProfile {
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
}

interface IGMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

export default function InstagramPage() {
  const { posts: allPosts } = useDashboardScheduledPosts();
  const posts = allPosts.filter(
    (p) => p.platform === "instagram" || p.platform === "both",
  );
  const [profile, setProfile] = useState<IGProfile | null>(null);
  const [media, setMedia] = useState<IGMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const { meta } = useMetaConnection();

  useEffect(() => {
    const locationId = getStoredActiveLocationId();
    if (!meta?.connected || !meta.igAccountId || !locationId) {
      setLoading(false);
      return;
    }
    fetch(`/api/meta/insights?locationId=${encodeURIComponent(locationId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.instagram) setProfile(data.instagram);
        if (data?.igMedia?.data) setMedia(data.igMedia.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [meta?.connected, meta?.igAccountId]);

  const scheduled = posts.filter((p) => p.status === "scheduled");
  const totalLikes = media.reduce((sum, m) => sum + (m.like_count || 0), 0);
  const totalComments = media.reduce((sum, m) => sum + (m.comments_count || 0), 0);
  const engRate = profile?.followers_count && media.length
    ? (((totalLikes + totalComments) / media.length / profile.followers_count) * 100).toFixed(1)
    : "—";

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text font-heading">Instagram</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {profile?.username ? `@${profile.username}` : "Profile insights & scheduled posts"}
            </p>
          </div>
        </div>
        <a
          href={profile?.username ? `https://www.instagram.com/${profile.username}` : "https://www.instagram.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all self-start"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Open Instagram
        </a>
      </div>

      {!meta?.connected && (
        <div className="rounded-2xl bg-surface border border-border p-8 text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] mx-auto mb-3 text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-text mb-1">Connect Your Instagram</h3>
          <p className="text-xs text-text-secondary mb-4">Go to Settings to connect your Facebook page (with linked Instagram business account)</p>
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all">
            Go to Settings
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Followers", value: loading ? "—" : (profile?.followers_count?.toLocaleString() || "0"), color: "accent" },
          { label: "Total Posts", value: loading ? "—" : (profile?.media_count?.toLocaleString() || "0"), color: "success" },
          { label: "Engagement", value: loading ? "—" : `${engRate}%`, color: "accent-cyan" },
          { label: "Recent Likes", value: loading ? "—" : totalLikes.toLocaleString(), color: "warning" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface border border-border p-5">
            <p className={`text-2xl font-bold text-${stat.color} font-heading`}>{stat.value}</p>
            <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instagram media grid */}
        <div className="rounded-2xl bg-surface border border-border p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-text mb-4">Recent Posts</h3>
          {media.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">
              {loading ? "Loading..." : meta?.connected ? "No recent posts found" : "Connect Instagram to see posts"}
            </p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {media.slice(0, 12).map((item) => (
                <a
                  key={item.id}
                  href={item.permalink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-xl overflow-hidden bg-elevated"
                >
                  <img
                    src={item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url}
                    alt={item.caption?.slice(0, 60) || ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-3 text-white text-xs font-semibold">
                      <span>&#x2764; {item.like_count || 0}</span>
                      <span>&#x1F4AC; {item.comments_count || 0}</span>
                    </div>
                  </div>
                  {item.media_type === "VIDEO" && (
                    <div className="absolute top-2 right-2">
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24" className="drop-shadow-lg">
                        <path d="M8 5.14v13.72a1 1 0 001.5.86l11.14-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" />
                      </svg>
                    </div>
                  )}
                </a>
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
            <p className="text-xs text-text-secondary text-center py-8">No scheduled Instagram posts</p>
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
          <h3 className="text-sm font-bold text-text mb-4">Profile</h3>
          {profile ? (
            <div className="space-y-3">
              {profile.profile_picture_url && (
                <img src={profile.profile_picture_url} alt="" className="w-16 h-16 rounded-full mx-auto" />
              )}
              {profile.username && (
                <p className="text-sm font-semibold text-text text-center">@{profile.username}</p>
              )}
              {profile.biography && (
                <p className="text-xs text-text-secondary text-center">{profile.biography}</p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-text font-heading">{profile.followers_count?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-text-secondary">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-text font-heading">{profile.media_count?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-text-secondary">Posts</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-secondary text-center py-6">
              {loading ? "Loading..." : "Connect Instagram to see profile"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
