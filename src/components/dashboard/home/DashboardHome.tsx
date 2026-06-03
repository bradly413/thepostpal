"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Home,
  Plus,
  CalendarDays,
  Image as ImageIcon,
  BarChart3,
  User,
  Settings,
  Sparkles,
  Send,
  ArrowUpRight,
  ChevronRight,
  Sun,
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

// ── Hero slideshow content (seasonal hooks → "schedule a post") ──────────────
const SLIDES = [
  {
    title: "Father's Day",
    date: "June 15",
    img: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1300&q=80&auto=format&fit=crop",
  },
  {
    title: "Fourth of July",
    date: "America 250",
    img: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=1300&q=80&auto=format&fit=crop",
  },
  {
    title: "Summer Kickoff",
    date: "June 20",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1300&q=80&auto=format&fit=crop",
  },
  {
    title: "Shop Local",
    date: "Every Week",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1300&q=80&auto=format&fit=crop",
  },
];

// ── Audience strip (placeholder — wire to real followers/engagers later) ─────
const AUDIENCE = [
  { name: "stolinksi", img: "https://randomuser.me/api/portraits/women/2.jpg" },
  { name: "henrihelvetica", img: "https://randomuser.me/api/portraits/women/3.jpg" },
  { name: "sierra.argyle.art", img: "https://randomuser.me/api/portraits/women/4.jpg" },
  { name: "szynszyliszys", img: "https://randomuser.me/api/portraits/women/5.jpg" },
  { name: "sarasoueidan", img: "https://randomuser.me/api/portraits/women/6.jpg" },
  { name: "kosamari", img: "https://randomuser.me/api/portraits/women/7.jpg" },
  { name: "paullewis", img: "https://randomuser.me/api/portraits/women/9.jpg" },
];

// ── Weather (Open-Meteo, no API key) ─────────────────────────────────────────
const WX_LAT = 38.627;
const WX_LON = -90.199; // St. Louis (demo market) — swap to location later
function wxIcon(code: number) {
  if (code === 0 || code === 1) return { Icon: Sun, label: "Clear", color: "#f5a524" };
  if (code === 2) return { Icon: CloudSun, label: "Partly Cloudy", color: "#f5a524" };
  if (code === 3) return { Icon: Cloud, label: "Cloudy", color: "#94a3b8" };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Foggy", color: "#94a3b8" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, label: "Rain", color: "#60a5fa" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: CloudSnow, label: "Snow", color: "#93c5fd" };
  if (code >= 95) return { Icon: CloudLightning, label: "Storms", color: "#a78bfa" };
  return { Icon: CloudSun, label: "Partly Cloudy", color: "#f5a524" };
}

interface Weather { temp: number; high: number; low: number; code: number; }

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

  // auto-advance slideshow
  useEffect(() => {
    const t = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => window.clearInterval(t);
  }, []);

  // live weather
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${WX_LAT}&longitude=${WX_LON}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`,
        );
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setWx({
          temp: Math.round(j.current?.temperature_2m ?? 72),
          code: j.current?.weather_code ?? 2,
          high: Math.round(j.daily?.temperature_2m_max?.[0] ?? 78),
          low: Math.round(j.daily?.temperature_2m_min?.[0] ?? 61),
        });
      } catch {
        /* keep fallback */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // GSAP entrance
  useGSAP(
    () => {
      if (!data) return;
      // Entrance via a tiny SCALE (not opacity): GSAP runs on rAF, which
      // throttles in background/occluded tabs and can freeze a tween mid-way.
      // A frozen opacity = blank page; a frozen scale ≈ 0.99 is fully visible
      // and imperceptible. Content is opacity:1 by default, so it can never
      // get stuck invisible.
      gsap.from(".anim", {
        scale: 0.985,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.05,
        transformOrigin: "50% 50%",
        clearProps: "transform",
      });
    },
    { scope: root, dependencies: [!!data] },
  );

  // ── derived: calendar markers from real scheduled posts ──
  const now = new Date();
  const calCells = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayD = now.getDate();

    const marked = new Set<number>();
    const collect = (iso?: string | null) => {
      if (!iso) return;
      const d = new Date(iso);
      if (d.getFullYear() === year && d.getMonth() === month) marked.add(d.getDate());
    };
    if (data) {
      collect(data.nextUp?.scheduledFor);
      data.recentPosts?.forEach((p) => collect(p.scheduledFor));
    }

    const cells: { day: number | null; today?: boolean; has?: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, today: d === todayD, has: marked.has(d) });
    while (cells.length % 7 !== 0) cells.push({ day: null });
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── derived: analytics series ──
  const series = useMemo(() => {
    const h = data?.weeklyOverview?.barHeights;
    if (h && h.length >= 4) return h;
    return [22, 30, 26, 42, 38, 55, 48, 64, 72, 68, 84, 92];
  }, [data]);

  const areaPath = useMemo(() => {
    const w = 100, hgt = 100, n = series.length;
    const max = Math.max(...series, 1);
    const pts = series.map((v, i) => [(i / (n - 1)) * w, hgt - (v / max) * (hgt - 8) - 4]);
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L ${w} ${hgt} L 0 ${hgt} Z`;
    return { line, area, last: pts[pts.length - 1] };
  }, [series]);

  if (loading && !data) {
    return (
      <div className="pb-home2">
        <DashboardHomeStyles />
        <div className="home2">
          <div className="anim" style={{ borderRadius: 28, background: "rgba(255,255,255,0.5)", minHeight: 400 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 22 }}>
              <div style={{ height: 340, borderRadius: 26, background: "rgba(255,255,255,0.4)", animation: "pulse 1.6s ease-in-out infinite" }} />
              <div style={{ height: 340, borderRadius: 22, background: "rgba(255,255,255,0.4)" }} />
            </div>
            <div style={{ height: 270, borderRadius: 24, background: "rgba(255,255,255,0.4)" }} />
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
          <div className="mod" style={{ gridColumn: "1 / -1", maxWidth: 440, margin: "auto", textAlign: "center", minHeight: 0 }}>
            <h2 style={{ fontFamily: "var(--font-playfair, serif)", fontSize: 26 }}>Calm room, closed door.</h2>
            <p style={{ marginTop: 10, color: "var(--ink-soft)", fontSize: 14 }}>{error || "This workspace is not ready yet."}</p>
            <button onClick={() => void refresh()} className="glowbtn" style={{ minHeight: 52, marginTop: 18, letterSpacing: 1 }}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const cur = SLIDES[slide];
  const wxI = wxIcon(wx.code);
  const engagement = data.weeklyOverview?.engagementLabel || "+12%";
  const posts = data.weeklyOverview?.postsCount ?? data.recentPosts?.length ?? 0;
  const topPost = data.nextUp?.copy || data.recentPosts?.[0]?.copy || "Your first post";

  const NAV_TOP = [
    { label: "Home", href: "/dashboard", Icon: Home },
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

  return (
    <div className="pb-home2" ref={root}>
      <DashboardHomeStyles />
      <div className="home2">
        {/* Sidebar */}
        <aside className="side2 anim">
          <Link href="/dashboard" className="logo" aria-label="Posterboy">
            poster<em>boy</em><span className="tm">™</span>
          </Link>
          <nav>
            {NAV_TOP.map(({ label, href, Icon }) => (
              <Link key={label} href={href} className={label === "Home" ? "active" : ""}>
                <Icon /> <span>{label}</span>
              </Link>
            ))}
            <div className="grp-gap" />
            {NAV_BOTTOM.map(({ label, href, Icon }) => (
              <Link key={label} href={href}><Icon /> <span>{label}</span></Link>
            ))}
          </nav>
          <div className="spacer" />
          <div className="foot">
            <span className="av">{data.userInitials}</span>
            <span>
              <div className="nm">{data.userName}</div>
              <div className="rl">{data.userRole}</div>
            </span>
          </div>
        </aside>

        {/* Main */}
        <main className="main2">
          <div className="top2">
            {/* Hero slideshow */}
            <section className="hero2 anim" aria-label="Featured occasions">
              {SLIDES.map((s, i) => (
                <div key={s.title} className={`slide${i === slide ? " on" : ""}`} style={{ backgroundImage: `url('${s.img}')` }} />
              ))}
              <div className="scrim" />
              <span className="slabel">Auto Slideshow · {SLIDES.length} slides</span>
              <div className="hbody">
                <div className="htitle">{cur.title}<br />{cur.date}</div>
                <div className="hsub">Let&apos;s schedule your post now.</div>
              </div>
              <div className="dots">
                {SLIDES.map((s, i) => (
                  <span key={s.title} className={`d${i === slide ? " on" : ""}`} onClick={() => setSlide(i)} role="button" aria-label={`Slide ${i + 1}`} />
                ))}
              </div>
            </section>

            {/* Glow shortcut buttons */}
            <div className="shortcuts2">
              <Link href="/dashboard/studio" className="glowbtn anim"><Sparkles /> Create</Link>
              <Link href="/dashboard/calendar" className="glowbtn anim"><CalendarDays /> Schedule</Link>
              <Link href="/dashboard/editor" className="glowbtn anim"><Send /> Post</Link>
            </div>
          </div>

          <div className="slidecount">Plan your week — {posts} post{posts === 1 ? "" : "s"} this cycle</div>

          {/* Modules */}
          <div className="modules2">
            {/* Calendar */}
            <Link href="/dashboard/calendar" className="mod cal2 anim" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="mhead">
                <span className="mtitle">{now.toLocaleString("en-US", { month: "long" })}</span>
                <span className="mlink"><ChevronRight size={15} /></span>
              </div>
              <div className="grid">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="dow">{d}</span>)}
                {calCells.map((c, i) => (
                  <span key={i} className={`cell${c.day == null ? " dim" : ""}${c.today ? " today" : ""}${c.has ? " has" : ""}`}>
                    {c.day ?? ""}
                  </span>
                ))}
              </div>
              <div className="legend"><span className="dot" /> Scheduled posts</div>
            </Link>

            {/* Analytics */}
            <Link href="/dashboard/analytics" className="mod an2 anim" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="mhead">
                <span className="mtitle">Performance</span>
                <span className="mlink"><ArrowUpRight size={15} /></span>
              </div>
              <div className="chartwrap">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="anfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8bd450" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#43c59e" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath.area} fill="url(#anfill)" />
                  <path d={areaPath.line} fill="none" stroke="#43c59e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  <circle cx={areaPath.last[0]} cy={areaPath.last[1]} r="2.6" fill="#2faa6a" stroke="#fff" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
              <div className="stats">
                <div className="st"><div className="k">Reach</div><div className="v">2.4k</div></div>
                <div className="st"><div className="k">Likes</div><div className="v">318</div></div>
                <div className="st"><div className="k">Engage</div><div className="v">{engagement}<span className="up">▲</span></div></div>
              </div>
              <div className="toppost">Top post · <b>{topPost.length > 26 ? topPost.slice(0, 26) + "…" : topPost}</b></div>
            </Link>

            {/* Weather */}
            <div className="mod wx2 anim">
              <div className="wtop">
                <div>
                  <div className="temp">{wx.temp}<span className="deg">°</span></div>
                  <div className="cond">{wxI.label}</div>
                  <div className="loc">{data.userRole?.includes(",") ? data.userRole : "St. Louis, MO"}</div>
                </div>
                <span className="wicon"><wxI.Icon style={{ color: wxI.color }} strokeWidth={1.5} /></span>
              </div>
              <div className="wfoot">
                <span>H <b>{wx.high}°</b></span>
                <span>L <b>{wx.low}°</b></span>
                <span>Clear skies to post</span>
              </div>
            </div>
          </div>

          {/* Audience strip */}
          <div className="row2">
            <section className="mod friends2 anim">
              <div className="mhead">
                <span className="mtitle">Audience</span>
                <span className="mlink"><ArrowUpRight size={15} /></span>
              </div>
              <div className="overflow-x">
                <div className="hfriends">
                  {AUDIENCE.map((a) => (
                    <figure key={a.name}>
                      <picture><img src={a.img} alt={a.name} loading="lazy" /></picture>
                      <figcaption>{a.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
