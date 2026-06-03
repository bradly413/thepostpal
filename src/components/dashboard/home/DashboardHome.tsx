"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Home,
  Plus,
  CalendarDays,
  CalendarPlus,
  Image as ImageIcon,
  BarChart3,
  User,
  Settings,
  Send,
  Bell,
  Sun,
  ChevronDown,
  Sun as SunIcon,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from "lucide-react";
import { DashboardHomeStyles } from "@/components/dashboard/home/dashboard-home-styles";
import {
  loadDashboardHomeSnapshot,
  type DashboardHomeSnapshot,
} from "@/lib/dashboard-home-data";
import { formatDashboardApiMessage } from "@/lib/dashboard-api";

// ── Hero slideshow (seasonal hooks) ──────────────────────────
const SLIDES = [
  { title: "Father's Day", date: "June 15", img: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1300&q=80&auto=format&fit=crop" },
  { title: "Fourth of July", date: "America 250", img: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=1300&q=80&auto=format&fit=crop" },
  { title: "Summer Kickoff", date: "June 20", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1300&q=80&auto=format&fit=crop" },
  { title: "Shop Local", date: "Every Week", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1300&q=80&auto=format&fit=crop" },
];

// Placeholder media (recent media + post thumbnails) — wire to /api/photos later
const MEDIA = [
  "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=240&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=240&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=240&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=240&q=80&auto=format&fit=crop",
];

const AUDIENCE = [
  { name: "Sara", img: "https://randomuser.me/api/portraits/women/2.jpg", ring: "#34c759" },
  { name: "Maya", img: "https://randomuser.me/api/portraits/women/3.jpg", ring: "#5ac8fa" },
  { name: "Ken", img: "https://randomuser.me/api/portraits/men/4.jpg", ring: "#c7c7cc" },
  { name: "Omar", img: "https://randomuser.me/api/portraits/men/5.jpg", ring: "#007aff" },
  { name: "Lia", img: "https://randomuser.me/api/portraits/women/6.jpg", ring: "#ff9500" },
  { name: "Rae", img: "https://randomuser.me/api/portraits/women/7.jpg", ring: "#ff2d55" },
];

const POST_PLATFORMS = ["instagram", "facebook", "x"] as const;

// ── Weather (Open-Meteo) ─────────────────────────────────────
const WX_LAT = 38.627;
const WX_LON = -90.199;
function wxIcon(code: number) {
  if (code === 0 || code === 1) return { Icon: SunIcon, label: "Clear", color: "#f5a524" };
  if (code === 2) return { Icon: CloudSun, label: "Partly Cloudy", color: "#f5a524" };
  if (code === 3) return { Icon: Cloud, label: "Cloudy", color: "#94a3b8" };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Foggy", color: "#94a3b8" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: "Rain", color: "#60a5fa" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, label: "Snow", color: "#93c5fd" };
  if (code >= 95) return { Icon: CloudLightning, label: "Storms", color: "#a78bfa" };
  return { Icon: CloudSun, label: "Partly Cloudy", color: "#f5a524" };
}
interface Weather { temp: number; high: number; low: number; code: number; }

function PlatformIcon({ p }: { p: string }) {
  if (p === "instagram") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="#E1306C" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" stroke="#E1306C" strokeWidth="1.8" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="#E1306C" />
      </svg>
    );
  }
  if (p === "facebook") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#1877F2" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.02H7.9v-2.92h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.92h-2.34V22C18.34 21.24 22 17.08 22 12.06Z" />
      </svg>
    );
  }
  // X / Twitter
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0f1419" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function DashboardHome() {
  const root = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardHomeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [wx, setWx] = useState<Weather>({ temp: 72, high: 78, low: 61, code: 2 });

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
    return () => window.removeEventListener("dashboard-location-updated", refresh);
  }, [refresh]);

  useEffect(() => {
    const t = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WX_LAT}&longitude=${WX_LON}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`);
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setWx({
          temp: Math.round(j.current?.temperature_2m ?? 72),
          code: j.current?.weather_code ?? 2,
          high: Math.round(j.daily?.temperature_2m_max?.[0] ?? 78),
          low: Math.round(j.daily?.temperature_2m_min?.[0] ?? 61),
        });
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useGSAP(
    () => {
      if (!data) return;
      // tiny scale entrance — frozen mid-tween (bg tab) stays fully visible
      gsap.from(".anim", { scale: 0.985, duration: 0.45, ease: "power2.out", stagger: 0.05, transformOrigin: "50% 50%", clearProps: "transform" });
    },
    { scope: root, dependencies: [!!data] },
  );

  // Total Reach sparkline
  const reachPath = useMemo(() => {
    const series = data?.weeklyOverview?.barHeights?.length
      ? data.weeklyOverview.barHeights
      : [30, 26, 40, 34, 52, 46, 60, 54, 72, 66, 88, 96];
    const w = 100, h = 100, n = series.length, max = Math.max(...series, 1);
    const pts = series.map((v, i) => [(i / (n - 1)) * w, h - (v / max) * (h - 10) - 5]);
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    return { line, area: `${line} L ${w} ${h} L 0 ${h} Z` };
  }, [data]);

  // Upcoming posts
  const upcoming = useMemo(() => {
    const fallback = [
      { title: "Beach Day Essentials", when: "Jun 3 · 10:00 AM" },
      { title: "Palm Paradise", when: "Jun 5 · 2:00 PM" },
      { title: "Ride the Waves", when: "Jun 7 · 11:30 AM" },
    ];
    const posts = (data?.recentPosts || []).slice(0, 3);
    if (posts.length === 0) return fallback.map((f, i) => ({ ...f, img: MEDIA[i % MEDIA.length], platform: POST_PLATFORMS[i % 3] }));
    return posts.map((p, i) => ({
      title: p.copy.length > 26 ? p.copy.slice(0, 26) + "…" : p.copy || "Untitled post",
      when: p.scheduledFor
        ? new Date(p.scheduledFor).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "Unscheduled",
      img: MEDIA[i % MEDIA.length],
      platform: (p.platforms?.[0] as string) || POST_PLATFORMS[i % 3],
    }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="pb-home2">
        <DashboardHomeStyles />
        <div className="home2">
          <div className="anim" style={{ borderRadius: 28, background: "rgba(255,255,255,0.6)", minHeight: 400 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ height: 320, borderRadius: 26, background: "rgba(255,255,255,0.5)" }} />
            <div style={{ height: 220, borderRadius: 24, background: "rgba(255,255,255,0.5)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="pb-home2">
        <DashboardHomeStyles />
        <div className="home2" style={{ alignItems: "center", justifyContent: "center" }}>
          <div className="mod" style={{ gridColumn: "1 / -1", maxWidth: 440, margin: "auto", textAlign: "center", minHeight: 0, height: "auto" }}>
            <h2 style={{ fontFamily: "var(--font-playfair, serif)", fontSize: 26 }}>Calm room, closed door.</h2>
            <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: 14 }}>{error || "This workspace is not ready yet."}</p>
            <button onClick={() => void refresh()} className="ghostbtn" style={{ marginTop: 18 }}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const cur = SLIDES[slide];
  const wxI = wxIcon(wx.code);

  const NAV_TOP = [
    { label: "Home", href: "/dashboard", Icon: Home, active: true },
    { label: "Create", href: "/dashboard/studio", Icon: Plus },
    { label: "Schedule", href: "/dashboard/calendar", Icon: CalendarDays },
    { label: "Media", href: "/dashboard/photos", Icon: ImageIcon },
    { label: "Reports", href: "/dashboard/analytics", Icon: BarChart3 },
  ];
  const NAV_BOTTOM = [
    { label: "Account", href: "/dashboard/settings", Icon: User },
    { label: "Settings", href: "/dashboard/settings", Icon: Settings },
    { label: "Profile", href: "/dashboard/brand", Icon: User },
  ];
  const SHORTCUTS = [
    { label: "Create", sub: "Design a new post", href: "/dashboard/studio", Icon: Plus },
    { label: "Schedule", sub: "Plan your content", href: "/dashboard/calendar", Icon: CalendarPlus },
    { label: "Post", sub: "Publish now", href: "/dashboard/editor", Icon: Send },
  ];

  return (
    <div className="pb-home2" ref={root}>
      <DashboardHomeStyles />
      <div className="home2">
        {/* Sidebar */}
        <aside className="side2 anim">
          <Link href="/dashboard" className="logo" aria-label="Posterboy">
            poster<em>boy</em><span className="tm">®</span>
          </Link>
          <nav>
            {NAV_TOP.map(({ label, href, Icon, active }) => (
              <Link key={label} href={href} className={active ? "active" : ""}><Icon /> <span>{label}</span></Link>
            ))}
            <div className="grp-gap" />
            {NAV_BOTTOM.map(({ label, href, Icon }) => (
              <Link key={label} href={href}><Icon /> <span>{label}</span></Link>
            ))}
          </nav>
          <div className="spacer" />
          <button type="button" className="foot">
            <span className="av">{data.userInitials}</span>
            <span><div className="nm">{data.userName}</div><div className="rl">{data.userRole}</div></span>
            <ChevronDown size={15} style={{ marginLeft: "auto", color: "var(--ink-soft)" }} />
          </button>
        </aside>

        {/* Main */}
        <main className="main2">
          {/* Utility bar */}
          <div className="topbar2 anim">
            <button type="button" className="ut" aria-label="Theme"><Sun size={18} /></button>
            <button type="button" className="ut" aria-label="Notifications"><Bell size={18} /><span className="dot" /></button>
            <Link href="/dashboard/settings" className="ut avatar" aria-label="Account">
              <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="" />
            </Link>
          </div>

          {/* Hero + shortcuts */}
          <div className="top2">
            <section className="hero2 anim">
              {SLIDES.map((s, i) => (
                <div key={s.title} className={`slide${i === slide ? " on" : ""}`} style={{ backgroundImage: `url('${s.img}')` }} />
              ))}
              <div className="scrim" />
              <span className="slabel">Auto Slideshow · {SLIDES.length} slides</span>
              <div className="hbody">
                <div className="htitle">{cur.title}<br />{cur.date}</div>
                <div className="hsub">Let&apos;s schedule your post now.</div>
                <Link href="/dashboard/studio" className="herobtn">Create Post</Link>
              </div>
              <div className="dots">
                {SLIDES.map((s, i) => (
                  <span key={s.title} className={`d${i === slide ? " on" : ""}`} onClick={() => setSlide(i)} role="button" aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </section>

            <div className="shortcuts2">
              {SHORTCUTS.map(({ label, sub, href, Icon }) => (
                <Link key={label} href={href} className="scut anim">
                  <span className="ic"><Icon size={20} /></span>
                  <span className="tx"><b>{label}</b><small>{sub}</small></span>
                </Link>
              ))}
            </div>
          </div>

          {/* Middle row */}
          <div className="modules2">
            {/* Upcoming posts */}
            <div className="mod up2 anim">
              <div className="mhead"><span className="mtitle2">Upcoming Posts</span><Link href="/dashboard/calendar" className="viewall">View all</Link></div>
              <div className="uplist">
                {upcoming.map((u, i) => (
                  <div className="uprow" key={i}>
                    <span className="upthumb" style={{ backgroundImage: `url('${u.img}')` }} />
                    <span className="upinfo"><span className="upt">{u.title}</span><span className="upd">{u.when}</span></span>
                    <span className="upplat"><PlatformIcon p={u.platform} /></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total reach */}
            <div className="mod reach2 anim">
              <div className="mhead"><span className="mtitle2">Total Reach</span><span className="period">This Month <ChevronDown size={13} /></span></div>
              <div className="bignum">2.4K</div>
              <div className="delta up">▲ 18.6% <span>vs last month</span></div>
              <div className="spark">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="reachfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34c759" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#34c759" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={reachPath.area} fill="url(#reachfill)" />
                  <path d={reachPath.line} fill="none" stroke="#1f9d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </div>

            {/* Weather */}
            <div className="mod wx2 anim">
              <div className="wtop">
                <div>
                  <div className="temp">{wx.temp}<span className="deg">°</span></div>
                  <div className="cond">{wxI.label}</div>
                  <div className="loc">St. Louis, MO</div>
                </div>
                <span className="wicon"><wxI.Icon style={{ color: wxI.color }} strokeWidth={1.5} /></span>
              </div>
              <div className="wfoot">
                <span>H <b>{wx.high}°</b></span>
                <span>L <b>{wx.low}°</b></span>
                <Link href="/dashboard/calendar" className="wlink">Clear skies to post</Link>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="row2">
            <div className="mod media2 anim">
              <div className="mhead"><span className="mtitle2">Recent Media</span><Link href="/dashboard/photos" className="viewall">View all</Link></div>
              <div className="mediastrip">
                {MEDIA.map((m, i) => (
                  <Link key={i} href="/dashboard/photos" className="mediathumb" style={{ backgroundImage: `url('${m}')` }} aria-label="Open media" />
                ))}
              </div>
            </div>

            <div className="mod friends2 anim">
              <div className="mhead"><span className="mtitle2">Audience</span><Link href="/dashboard/analytics" className="viewall">View all</Link></div>
              <div className="audrow">
                {AUDIENCE.map((a) => (
                  <span key={a.name} className="aud" style={{ ["--ring" as string]: a.ring }}>
                    <img src={a.img} alt={a.name} loading="lazy" />
                  </span>
                ))}
                <button type="button" className="audadd" aria-label="Add"><Plus size={18} /></button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
