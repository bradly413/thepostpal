"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Image as ImageIcon,
  Hexagon,
  Settings,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Pencil,
  ExternalLink,
  ArrowUpRight,
  Bookmark,
  AudioLines,
} from "lucide-react";
import { DashboardShellStyles } from "@/components/dashboard/home/dashboard-shell-styles";
import {
  formatScheduleLabel,
  formatShortDate,
  HERO_IMAGES,
  loadDashboardHomeSnapshot,
  type DashboardHomeSnapshot,
} from "@/lib/dashboard-home-data";
import { formatDashboardApiMessage } from "@/lib/dashboard-api";

export default function DashboardHome() {
  const [data, setData] = useState<DashboardHomeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await loadDashboardHomeSnapshot());
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load the dashboard right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("dashboard-location-updated", refresh);
    return () => {
      window.removeEventListener("dashboard-location-updated", refresh);
    };
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f1f1f3] text-sm text-zinc-500">
        <div className="w-full max-w-5xl px-6">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="h-[360px] animate-pulse rounded-[36px] bg-black/[0.05]" />
            <div className="space-y-6">
              <div className="h-[220px] animate-pulse rounded-[30px] bg-black/[0.05]" />
              <div className="h-[140px] animate-pulse rounded-[30px] bg-black/[0.05]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f1f1f3] px-6">
        <div className="max-w-md rounded-[28px] border border-[#e5ddd2] bg-[#fbf8f3] px-8 py-10 text-center shadow-[0_20px_50px_-40px_rgba(20,20,20,0.35)]">
          <h2 className="font-heading text-[28px] leading-tight text-[#1d1d1b]">
            Calm room, closed door.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6b6259]">
            {error || "This workspace is not ready yet."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" className="pb-btn-primary text-sm" onClick={() => void refresh()}>
              Try again
            </button>
            <Link href="/dashboard/organization" className="pb-btn-secondary text-sm">
              Review locations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const featuredTitle = data.nextUp?.copy
    ? `${data.nextUp.copy.slice(0, 28)}${data.nextUp.copy.length > 28 ? "..." : ""}`
    : "Modern living, redefined.";
  const featuredSub = data.nextUp?.status === "scheduled" ? "Scheduled post" : "Market update";

  const voiceParts = data.brandVoiceLine.replace(/\.$/, "").split(". ").filter(Boolean);
  const voiceQuote = (
    <>
      {voiceParts[0] || "Confident."} {voiceParts[1] || "Local."}
      <br />
      {voiceParts[2] || "Human."}
    </>
  );

  const nextTitle = data.nextUp?.copy
    ? `${data.nextUp.copy.slice(0, 38)}${data.nextUp.copy.length > 38 ? "..." : ""}`
    : "Market update: Spring trends";
  const nextSched = data.nextUp ? formatScheduleLabel(data.nextUp) : "No scheduled posts yet";
  const nextMonth = data.nextUp?.scheduledFor
    ? new Date(data.nextUp.scheduledFor).toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    : "MAY";
  const nextDay = data.nextUp?.scheduledFor
    ? new Date(data.nextUp.scheduledFor).toLocaleDateString("en-US", { day: "2-digit" })
    : "24";

  const statusLabel = (status: string) => {
    if (status === "published") return "Published";
    if (status === "scheduled") return "Scheduled";
    if (status === "approved") return "Approved";
    if (status === "needs_review") return "In review";
    return status.replace(/_/g, " ");
  };

  const recent = data.recentPosts.slice(0, 3).map((post, idx) => ({
    title: post.copy.length > 36 ? `${post.copy.slice(0, 36)}...` : post.copy,
    date: post.scheduledFor
      ? formatScheduleLabel(post).replace("Scheduled for ", "")
      : formatShortDate(post),
    img: HERO_IMAGES[idx % HERO_IMAGES.length],
    status: statusLabel(post.status),
  }));

  return (
    <div className="pb-dash h-full min-h-0 overflow-y-auto">
      <DashboardShellStyles />
      <div className="app">
        <aside className="sidebar">
          <Link href="/dashboard" className="logo" aria-label="Posterboy — Home">
            POSTER<span className="red">BOY</span>
          </Link>

          <button type="button" className="profile">
            <span
              className="avatar"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80&auto=format&fit=crop&crop=faces')",
              }}
            />
            <span className="meta">
              <span className="name">{data.userName}</span>
              <span className="role">{data.userRole}</span>
            </span>
            <ChevronDown className="chev" size={16} />
          </button>

          <Link href="/dashboard/editor" className="create-btn">
            <Plus size={16} strokeWidth={2.5} /> Create
          </Link>

          <nav className="nav">
            <Link href="/dashboard/dispatch">
              <Calendar size={18} />
              <span>Schedule</span>
            </Link>
            <Link href="/dashboard/templates">
              <ImageIcon size={18} />
              <span>Library</span>
            </Link>
            <Link href="/dashboard/brand-intake">
              <Hexagon size={18} />
              <span>Brand</span>
            </Link>
            <Link href="/dashboard/settings">
              <Settings size={18} />
              <span>Settings</span>
            </Link>
          </nav>

          <div className="upgrade">
            <Sparkles className="spark" size={20} />
            <div className="label">Upgrade to</div>
            <div className="pro">Posterboy Pro</div>
            <div className="copy">Unlock advanced tools, brand kits, and more.</div>
            <Link href="/pricing">Upgrade now</Link>
          </div>

          <button type="button" className="sidebar-foot">
            <span className="mini-avatar">{data.userInitials}</span>
            <span className="name">{data.userName}</span>
            <ChevronDown className="chev" size={14} />
          </button>
        </aside>

        <main className="main">
          <section className="hero">
            <div
              className="hero-image"
              style={{
                backgroundImage: `url('${HERO_IMAGES[0]}')`,
              }}
            />
            <button type="button" className="pop-out" aria-label="Open">
              <ExternalLink size={16} />
            </button>

            <div className="feature-week">
              <div className="ftag">Featured this week</div>
              <div className="ftitle">{featuredTitle}</div>
              <div className="fsub">{featuredSub}</div>
              <ArrowUpRight className="farrow" size={14} />
            </div>

            <div className="hero-content">
              <span className="pill">
                <span className="live-dot" />
                Live
              </span>
              <span className="tag">Featured post</span>
              <h1>
                What should
                <br />
                we post next?
              </h1>
              <p className="sub">Pick up where you left off and keep your brand showing up consistently.</p>
              <div className="hero-actions">
                <Link href="/dashboard/editor" className="btn-primary">
                  <Pencil size={14} />
                  Create new post
                </Link>
                <Link href="/dashboard/studio" className="btn-secondary">
                  <Sparkles size={14} />
                  Open Studio
                </Link>
              </div>
            </div>

            <div className="dots">
              <span className="dot active" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </section>

          <div className="row3">
            <div className="card">
              <div className="card-head">
                <span className="icon-badge">
                  <Bookmark size={16} />
                </span>
                <span className="label">Recently posted</span>
              </div>
              <div className="posts">
                {recent.length > 0 ? (
                  recent.map((p) => (
                    <div className="post" key={p.title}>
                      <span className="thumb" style={{ backgroundImage: `url('${p.img}')` }} />
                      <span className="info">
                        <span className="title">{p.title}</span>
                        <span className="date">{p.date}</span>
                      </span>
                      <span className="live-tag">
                        <span className="d" />
                        {p.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="post">
                    <span className="info">
                      <span className="title">No posts yet</span>
                    </span>
                  </div>
                )}
              </div>
              <Link href="/dashboard/drafts" className="view-all">
                <span>View all posts</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="icon-badge">
                  <AudioLines size={16} />
                </span>
                <span className="label">Brand voice</span>
              </div>
              <div className="voice-quote">{voiceQuote}</div>
              <div className="voice-sub">{data.brandVoiceSub}</div>
              <Link href="/dashboard/brand-intake" className="voice-edit">
                <span>Edit brand voice</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <Link href="/dashboard/studio" className="card studio-card">
              <div className="studio-head">
                <span className="p-badge">P</span>
                <span className="ai-tag">AI · Studio</span>
              </div>
              <div className="studio-title">
                Create with
                <br />
                Posterboy Studio
              </div>
              <div className="studio-sub">
                Image, video, copy —
                <br />
                one canvas, your voice.
              </div>
              <div className="studio-image" />
            </Link>
          </div>
        </main>

        <aside className="right">
          <div className="card nextup">
            <div className="card-head">
              <span className="icon-badge">
                <Calendar size={16} />
              </span>
              <span className="label">Next up</span>
            </div>
            <div className="img-wrap">
              <div
                className="img"
                style={{
                  backgroundImage: `url('${data.nextUpImage || HERO_IMAGES[1]}')`,
                }}
              />
              <div className="date-badge">
                <div className="m">{nextMonth}</div>
                <div className="d">{nextDay}</div>
              </div>
            </div>
            <h3>{nextTitle}</h3>
            <div className="sched">{nextSched}</div>
            <Link href="/dashboard/dispatch" className="view-schedule">
              View schedule
            </Link>
          </div>

          <div className="card week-saved">
            <div className="label">This week</div>
            <div className="big">
              {data.hoursSaved}
              <span className="h">h</span>
            </div>
            <div className="subtitle">saved with Posterboy</div>
            <svg className="squiggle" viewBox="0 0 130 50" xmlns="http://www.w3.org/2000/svg">
              <path d="M 4 36 Q 18 18, 30 30 T 56 28 Q 70 14, 84 26 T 116 22" />
              <circle className="dot-end" cx="120" cy="22" r="4" />
            </svg>
          </div>

          <div className="card overview">
            <h4>Weekly overview</h4>
            <div className="range">{data.weeklyOverview.rangeLabel}</div>
            <div className="chart">
              {data.weeklyOverview.barHeights.map((h, i) => (
                <div className="bar-col" key={i}>
                  <div
                    className={`bar${i === data.weeklyOverview.activeBarIndex ? " active" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="stats">
              <div className="stat">
                <div className="skey">Posts</div>
                <div className="sval">{data.weeklyOverview.postsCount}</div>
              </div>
              <div className="stat">
                <div className="skey">Engagement</div>
                <div className={`sval${data.weeklyOverview.engagementPositive ? " green" : ""}`}>
                  {data.weeklyOverview.engagementLabel}
                </div>
              </div>
            </div>
            <Link href="/dashboard/analytics" className="view-analytics">
              <span>View analytics</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
