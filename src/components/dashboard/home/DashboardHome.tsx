"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Plus,
  CalendarPlus,
  Send,
  Bell,
  Sun as SunIcon,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  User,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Autoplay, Pagination, A11y, Keyboard } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { DashboardHomeStyles } from "@/components/dashboard/home/dashboard-home-styles";
import AppSidebar from "@/components/dashboard/AppSidebar";
import {
  loadDashboardHomeSnapshot,
  type DashboardHomeSnapshot,
} from "@/lib/dashboard-home-data";
import { formatDashboardApiMessage } from "@/lib/dashboard-api";
import { useDashboardPhotos } from "@/lib/use-dashboard-photos";
import { useActiveLocation } from "@/lib/use-active-location";
import { getHolidaysForYear } from "@/lib/holidays";

// ── Hero coverflow (seasonal hooks) ──────────────────────────
// Local seasonal slides only — stock imagery looked like another tenant's
// photos to beta users, so remote Unsplash slides were removed. Holidays
// beyond the two photographed ones render as warm typographic cards.
interface HeroSlide {
  title: string;
  date: string;
  img?: string;
  grad: number; // palette index for typographic cards
}

const SLIDES: HeroSlide[] = [
  { title: "Father's Day", date: "June 21st", img: "/hero/fathers-day.jpg", grad: 0 },
  { title: "Fourth of July", date: "America 250", img: "/hero/fourth-of-july.jpg", grad: 1 },
];

/** Next real holidays (from the calendar's own source) as typographic slides. */
function buildHeroSlides(): HeroSlide[] {
  const now = new Date();
  // local date key — toISOString() is UTC and dropped a holiday the evening before
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const photographed = SLIDES.map((s) => s.title.toLowerCase());
  const upcoming = [...getHolidaysForYear(now.getFullYear()), ...getHolidaysForYear(now.getFullYear() + 1)]
    .filter((h) => h.date >= todayKey)
    .filter((h) => !photographed.some((p) => h.name.toLowerCase().includes(p) || p.includes(h.name.toLowerCase())))
    .filter((h) => h.name !== "Independence Day") // covered by the Fourth of July photo slide
    .slice(0, 4)
    .map((h, i) => ({
      title: h.name,
      date: new Date(`${h.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      grad: i % 4,
    }));
  return [...SLIDES, ...upcoming];
}

const POST_PLATFORMS = ["instagram", "facebook", "x"] as const;

// ── Weather (Open-Meteo) ─────────────────────────────────────
// Lat/lon + label are derived per-tenant from the active location's geo.
// When the active location has no usable geo, the weather widget is hidden
// rather than defaulting to any one city.
interface WxPlace { lat: number; lon: number; label: string; }
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

// Real activity derived from the snapshot — no fabricated notifications.
function buildNotifs(
  data: DashboardHomeSnapshot | null,
): { lead?: string; body: string; time: string }[] {
  if (!data) return [];
  const out: { lead?: string; body: string; time: string }[] = [];
  if (data.pendingCount > 0)
    out.push({
      lead: "Review",
      body: `${data.pendingCount} draft${data.pendingCount > 1 ? "s" : ""} waiting for your review.`,
      time: "",
    });
  if (data.scheduledCount > 0)
    out.push({
      lead: "Scheduled",
      body: `${data.scheduledCount} post${data.scheduledCount > 1 ? "s" : ""} queued to publish.`,
      time: "",
    });
  return out;
}

export default function DashboardHome() {
  const root = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardHomeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const heroSlides = useMemo(() => buildHeroSlides(), []);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [heroPaused, setHeroPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wx, setWx] = useState<Weather | null>(null);
  const [wxPlace, setWxPlace] = useState<WxPlace | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifs = useMemo(() => buildNotifs(data), [data]);

  // Close the notifications panel on outside click or Escape.
  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  // Recent Media — live workspace photos only (no stock fallback: stock images
  // looked like another account's photos to beta users).
  const { photos: livePhotos } = useDashboardPhotos();
  const recentMedia = livePhotos.slice(0, 4).map((p) => p.src);

  // Active location drives the weather widget's geo + label (per-tenant).
  const { locationId, locations } = useActiveLocation();
  const activeLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );

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
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // A6: autoplay yields to the pause control and to prefers-reduced-motion.
  useEffect(() => {
    const s = swiperRef.current;
    if (!s || !s.autoplay) return;
    if (heroPaused || reduceMotion) s.autoplay.stop();
    else s.autoplay.start();
  }, [heroPaused, reduceMotion]);

  // Resolve lat/lon + a display label from the active location's geo. We use
  // Open-Meteo's free geocoding API on the location's city (scoped by state /
  // country when present). If there's nothing geocodable, leave wxPlace null so
  // the widget hides instead of defaulting to a single city for every tenant.
  useEffect(() => {
    let cancelled = false;
    setWxPlace(null);
    setWx(null);

    const city = activeLocation?.city?.trim();
    const state = activeLocation?.state?.trim();
    const country = activeLocation?.country?.trim();
    if (!city) return;

    (async () => {
      try {
        const params = new URLSearchParams({ name: city, count: "10", language: "en", format: "json" });
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const results: Array<{ latitude: number; longitude: number; name?: string; admin1?: string; country_code?: string; country?: string }> = Array.isArray(j?.results) ? j.results : [];
        if (results.length === 0) return;
        // Prefer a result whose region/country matches the location, when given.
        const match =
          (state && results.find((x) => x.admin1?.toLowerCase() === state.toLowerCase())) ||
          (country && results.find((x) => x.country?.toLowerCase() === country.toLowerCase() || x.country_code?.toLowerCase() === country.toLowerCase())) ||
          results[0];
        const labelParts = [match.name ?? city];
        if (state) labelParts.push(state);
        else if (match.admin1) labelParts.push(match.admin1);
        setWxPlace({ lat: match.latitude, lon: match.longitude, label: labelParts.join(", ") });
      } catch { /* no geo → widget stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [activeLocation?.city, activeLocation?.state, activeLocation?.country]);

  // Fetch the forecast once we have geo for the active location.
  useEffect(() => {
    if (!wxPlace) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${wxPlace.lat}&longitude=${wxPlace.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`);
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setWx({
          temp: Math.round(j.current?.temperature_2m ?? 0),
          code: j.current?.weather_code ?? 0,
          high: Math.round(j.daily?.temperature_2m_max?.[0] ?? 0),
          low: Math.round(j.daily?.temperature_2m_min?.[0] ?? 0),
        });
      } catch { /* leave wx null → widget hides */ }
    })();
    return () => { cancelled = true; };
  }, [wxPlace]);

  useGSAP(
    () => {
      if (!data) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // tiny scale entrance — frozen mid-tween (bg tab) stays fully visible
      gsap.from(".anim", { scale: 0.985, duration: 0.45, ease: "power2.out", stagger: 0.05, transformOrigin: "50% 50%", clearProps: "transform,willChange" });
    },
    { scope: root, dependencies: [!!data] },
  );

  // Total Reach sparkline
  const reachPath = useMemo(() => {
    // Real weekly activity only — no invented trend line when there's no data.
    const series = data?.weeklyOverview?.barHeights ?? [];
    if (series.length < 2) return { line: "", area: "" };
    const w = 100, h = 100, n = series.length, max = Math.max(...series, 1);
    const pts = series.map((v, i) => [(i / (n - 1)) * w, h - (v / max) * (h - 10) - 5]);
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    return { line, area: `${line} L ${w} ${h} L 0 ${h} Z` };
  }, [data]);

  // Upcoming posts
  const upcoming = useMemo(() => {
    const posts = (data?.recentPosts || []).slice(0, 3);
    return posts.map((p, i) => ({
      title: p.copy.length > 26 ? p.copy.slice(0, 26) + "…" : p.copy || "Untitled post",
      when: p.scheduledFor
        ? new Date(p.scheduledFor).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "Unscheduled",
      // Real posts use their own media (no stock fallback — that looked like
      // someone else's photo). Empty string → neutral placeholder thumbnail.
      img: p.mediaUrl || p.mediaUrls?.[0] || "",
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

  // Weather widget only renders when the active location has geo + a forecast.
  const showWeather = wxPlace !== null && wx !== null;
  const wxI = wx ? wxIcon(wx.code) : null;

  const SHORTCUTS = [
    { label: "Create", sub: "Design a new post", href: "/dashboard/studio", Icon: Plus },
    { label: "Schedule", sub: "Plan your content", href: "/dashboard/calendar", Icon: CalendarPlus },
    { label: "Post", sub: "Publish now", href: "/dashboard/editor", Icon: Send },
  ];

  return (
    <div className="pb-home2" ref={root}>
      <DashboardHomeStyles />
      <div className="home2">
        {/* Shared sidebar — identical on every dashboard page */}
        <AppSidebar />

        {/* Main */}
        <main className="main2">
          <h1 className="sr-only">Home</h1>
          {/* Utility bar */}
          <div className="topbar2 anim">
            <div className={`notif${notifOpen ? " open" : ""}`} ref={notifRef}>
              <button
                type="button"
                className="ut"
                aria-label={`Notifications${notifs.length ? ` (${notifs.length})` : ""}`}
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell size={18} />
                {notifs.length > 0 ? <span className="dot count">{notifs.length}</span> : null}
              </button>
              <div className="notif-panel" role="menu" aria-hidden={!notifOpen}>
                <div className="notif-head">Activity</div>
                {notifs.length === 0 ? (
                  <p className="notif-empty">You&rsquo;re all caught up.</p>
                ) : (
                  <ul className="notif-list">
                    {notifs.map((n, i) => (
                      <li
                        className="notif-item"
                        role="menuitem"
                        key={n.body}
                        style={{ "--i": i } as CSSProperties}
                      >
                        <span className="notif-dot" aria-hidden />
                        <p>
                          {n.lead ? <strong>{n.lead}</strong> : null}
                          {n.lead ? " " : null}
                          {n.body}
                          {n.time ? <span className="notif-time">{n.time}</span> : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <Link href="/dashboard/settings" className="ut avatar" aria-label="Account">
              <User size={18} />
            </Link>
          </div>

          {/* Hero coverflow — full-width seasonal carousel */}
          <section
            className="hero-cf anim"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocusCapture={() => setHeroPaused(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeroPaused(false);
            }}
          >
            <Swiper
              modules={[EffectCoverflow, Autoplay, Pagination, A11y, Keyboard]}
              effect="coverflow"
              grabCursor
              centeredSlides
              loop
              watchSlidesProgress
              onSlidesUpdated={(sw) => {
                // H8: occluded slides (and loop clones) leave the tab order
                sw.slides.forEach((sl) =>
                  sl.toggleAttribute("inert", !sl.classList.contains("swiper-slide-visible")),
                );
              }}
              onSlideChangeTransitionEnd={(sw) => {
                sw.slides.forEach((sl) =>
                  sl.toggleAttribute("inert", !sl.classList.contains("swiper-slide-visible")),
                );
              }}
              speed={600}
              slidesPerView="auto"
              coverflowEffect={{ rotate: 7, stretch: 80, depth: 170, modifier: 1, slideShadows: false }}
              autoplay={reduceMotion ? false : { delay: 4500, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              keyboard={{ enabled: true }}
              onSwiper={(s) => { swiperRef.current = s; }}
            >
              {heroSlides.map((s) => (
                <SwiperSlide key={`${s.title}-${s.date}`}>
                  <div className={`cf-card${s.img ? "" : ` cf-grad-${s.grad}`}`}>
                    {s.img ? (
                      <>
                        <div className="cf-img" style={{ backgroundImage: `url('${s.img}')` }} aria-hidden />
                        <div className="cf-scrim" aria-hidden />
                      </>
                    ) : null}
                    <div className="cf-body">
                      <div className="cf-title">{s.title}</div>
                      <div className="cf-date">{s.date}</div>
                      <Link href="/dashboard/studio" className="cf-btn">Create Post</Link>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            <span className="slabel">
              {reduceMotion ? "Carousel paused (reduced motion)" : heroPaused ? "Carousel paused" : `Auto carousel · ${heroSlides.length} slides`}
            </span>
            <button
              type="button"
              className="hero-pause"
              onClick={() => setHeroPaused((p) => !p)}
              aria-pressed={heroPaused || reduceMotion}
              aria-label={heroPaused || reduceMotion ? "Play hero carousel" : "Pause hero carousel"}
              disabled={reduceMotion}
            >
              {heroPaused || reduceMotion ? "Play" : "Pause"}
            </button>
          </section>

          {/* Shortcuts strip below the carousel */}
          <div className="shortcuts2">
            {SHORTCUTS.map(({ label, sub, href, Icon }) => (
              <Link key={label} href={href} className="scut anim">
                <span className="ic"><Icon size={20} /></span>
                <span className="tx"><b>{label}</b><small>{sub}</small></span>
              </Link>
            ))}
          </div>

          {/* Middle row */}
          <div className="modules2">
            {/* Upcoming posts */}
            <div className="mod up2 anim">
              <div className="mhead"><h2 className="mtitle2">Upcoming Posts</h2><Link href="/dashboard/calendar" className="viewall">View all</Link></div>
              <div className="uplist">
                {upcoming.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "14px 2px" }}>
                    No upcoming posts yet. <Link href="/dashboard/studio" className="viewall">Create one</Link>.
                  </div>
                ) : upcoming.map((u, i) => (
                  <div className="uprow" key={i}>
                    <span className="upthumb" style={u.img ? { backgroundImage: `url('${u.img}')` } : undefined} />
                    <span className="upinfo"><span className="upt">{u.title}</span><span className="upd">{u.when}</span></span>
                    <span className="upplat"><PlatformIcon p={u.platform} /></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total reach */}
            <div className="mod reach2 anim">
              <div className="mhead"><h2 className="mtitle2">Posts This Week</h2><span className="period">{data?.weeklyOverview?.rangeLabel ?? "This week"}</span></div>
              <div className="bignum">{data?.weeklyOverview?.postsCount ?? 0}</div>
              <div className={`delta ${data?.weeklyOverview?.engagementPositive === false ? "down" : "up"}`}>{data?.weeklyOverview?.engagementLabel ?? "On track"} <span>vs last week</span></div>
              <div className="spark">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="reachfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34c759" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#34c759" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={reachPath.area} fill="url(#reachfill)" />
                  <path d={reachPath.line} fill="none" stroke="#157a38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </div>

            {/* Weather — per-tenant, hidden when the active location has no geo */}
            {showWeather && wx && wxI && wxPlace && (
              <div className="mod wx2 anim">
                <div className="wtop">
                  <div>
                    <div className="temp">{wx.temp}<span className="deg">°</span></div>
                    <div className="cond">{wxI.label}</div>
                    <div className="loc">{wxPlace.label}</div>
                  </div>
                  <span className="wicon"><wxI.Icon style={{ color: wxI.color }} strokeWidth={1.5} /></span>
                </div>
                <div className="wfoot">
                  <span>H <b>{wx.high}°</b></span>
                  <span>L <b>{wx.low}°</b></span>
                  <Link href="/dashboard/calendar" className="wlink">Clear skies to post</Link>
                </div>
              </div>
            )}
          </div>

          {/* Bottom row */}
          <div className="row2">
            <div className="mod media2 anim">
              <div className="mhead"><h2 className="mtitle2">Recent Media</h2><Link href="/dashboard/photos" className="viewall">View all</Link></div>
              <div className="mediastrip">
                {recentMedia.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "14px 2px" }}>
                    No media yet. <Link href="/dashboard/photos" className="viewall">Add some</Link>.
                  </div>
                ) : recentMedia.map((m, i) => (
                  <Link key={i} href="/dashboard/photos" className="mediathumb" style={{ backgroundImage: `url('${m}')` }} aria-label={`Open media ${i + 1}`} />
                ))}
              </div>
            </div>

            <div className="mod friends2 anim">
              <div className="mhead"><h2 className="mtitle2">This Week</h2><Link href="/dashboard/drafts" className="viewall">View all</Link></div>
              <div className="audstats">
                <div><b>{data?.scheduledCount ?? 0}</b><small>Scheduled</small></div>
                <div><b>{data?.pendingCount ?? 0}</b><small>In review</small></div>
                <div><b>{data?.hoursSaved ?? 0}</b><small>Hrs saved</small></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
