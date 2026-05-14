"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import WaveformCanvas from "@/components/WaveformCanvas";
import { templates } from "@/lib/templates";
import { formatDuration, getThumbnail, getVideoId } from "@/lib/vimeo";
import type { VimeoVideo, VimeoListResponse } from "@/lib/vimeo";

const FALLBACK_VIDEOS = [
  { src: "", title: "Virtual Tour: West County Colonial", duration: "2:45" },
  { src: "", title: "Listing Walkthrough: Chesterfield", duration: "3:12" },
  { src: "", title: "Neighborhood Spotlight: Kirkwood", duration: "1:58" },
];

function SketchBorder() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = ref.current?.closest('.ai-card');
    if (!card) return;
    const onEnter = () => card.classList.add('start');
    const onEnd = () => card.classList.remove('start');
    card.addEventListener('pointerenter', onEnter);
    const svgs = card.querySelectorAll('.sketch-lines svg');
    svgs.forEach((s) => s.addEventListener('animationend', onEnd));
    return () => {
      card.removeEventListener('pointerenter', onEnter);
      svgs.forEach((s) => s.removeEventListener('animationend', onEnd));
    };
  }, []);

  const svgRect = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="0" y="0" width="100" height="100" rx="20" ry="20" pathLength="10" />
    </svg>
  );

  return (
    <div ref={ref} className="sketch-lines">
      <div>{svgRect}{svgRect}{svgRect}{svgRect}</div>
      <div>{svgRect}{svgRect}{svgRect}{svgRect}</div>
    </div>
  );
}

function VideoCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [vimeoVideos, setVimeoVideos] = useState<VimeoVideo[] | null>(null);

  useEffect(() => {
    fetch("/api/vimeo/videos")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VimeoListResponse | null) => {
        if (data?.data?.length) setVimeoVideos(data.data);
      })
      .catch(() => {});
  }, []);

  const slides = vimeoVideos
    ? vimeoVideos.map((v) => ({
        src: getThumbnail(v, 960),
        title: v.name,
        duration: formatDuration(v.duration),
        vimeoId: getVideoId(v),
      }))
    : FALLBACK_VIDEOS.map((v) => ({ ...v, vimeoId: "" }));

  const count = slides.length;
  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused || playing) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [paused, playing, next]);

  useEffect(() => {
    if (!playing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlaying(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [playing]);

  return (
    <div
      className="bento-card col-span-1 md:col-span-2 row-span-1 relative overflow-hidden group flex flex-col max-h-[320px] md:max-h-none lg:flex-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex-1 relative min-h-0">
        {slides.map((video, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              opacity: i === current ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
              pointerEvents: i === current ? "auto" : "none",
            }}
          >
            {video.src ? (
              <img src={video.src} alt={video.title} className="absolute inset-0 w-full h-full object-cover saturate-[0.85] contrast-[1.05] brightness-[0.95]" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744] via-[#2a2d35] to-[#1a1d23]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <button
              className="absolute inset-0 flex items-center justify-center"
              onClick={() => video.vimeoId && setPlaying(video.vimeoId)}
            >
              <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5.14v13.72a1 1 0 001.5.86l11.14-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="#D4A853" />
                </svg>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-between p-4">
        <div className="min-w-0 flex-1 relative h-10">
          <p className="text-sm font-semibold text-text">Listing Videos</p>
          <div className="relative h-4 mt-0.5">
            {slides.map((video, i) => (
              <p
                key={i}
                className="absolute inset-0 text-[11px] text-text-secondary/50 truncate transition-opacity duration-[1200ms]"
                style={{ opacity: i === current ? 1 : 0 }}
              >
                {video.title} · {video.duration}
              </p>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === current ? "w-4 bg-accent" : "w-1.5 bg-white/15 hover:bg-white/25"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={prev} className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-all">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={next} className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-all">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Vimeo player modal */}
      {playing && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPlaying(null); }}
        >
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.08] bg-black">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{slides[current]?.title}</p>
              <button
                onClick={() => setPlaying(null)}
                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                src={`https://player.vimeo.com/video/${playing}?autoplay=1&title=0&byline=0&portrait=0`}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text">{monthName}</p>
        <div className="flex gap-1">
          <button className="p-1 rounded-lg text-text-secondary hover:text-text transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button className="p-1 rounded-lg text-text-secondary hover:text-text transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-bold text-text-secondary/40 py-1">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`text-xs py-1.5 rounded-lg transition-colors ${
              day === null
                ? ""
                : day === today
                  ? "bg-accent text-black font-bold"
                  : "text-text-secondary/70 hover:text-text hover:bg-white/5 cursor-pointer"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </>
  );
}

const HERO_SLIDES = [
  { src: "", label: "New Listing Post" },
  { src: "", label: "Market Update" },
  { src: "", label: "Neighborhood Spotlight" },
  { src: "", label: "Just Sold" },
];

function NewPostSlideshow() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % HERO_SLIDES.length);
  const prev = () => setCurrent((c) => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <div className="bento-card col-span-1 md:col-span-2 row-span-1 relative overflow-hidden group flex flex-col min-h-[280px] lg:min-h-0">
      {/* Photo slides */}
      <div className="flex-1 relative min-h-0">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.label}
            className="absolute inset-0"
            style={{
              opacity: i === current ? 1 : 0,
              transition: "opacity 0.6s ease-in-out",
              pointerEvents: i === current ? "auto" : "none",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1d23] via-[#2a2d35] to-[#1a1d23]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
          </div>
        ))}

        {/* Content overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 drop-shadow-md">Quick Create</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-heading drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{HERO_SLIDES[current].label}</h2>
            <p className="text-[11px] text-white/50 mt-0.5 drop-shadow-md">Choose a template and start creating</p>
            <div className="flex items-center justify-between mt-3">
              <Link href="/dashboard/templates" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all">
                Get started
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === current ? "w-3.5 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-0.5">
                  <button onClick={prev} className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>
                  <button onClick={next} className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CAROUSEL_GRADIENTS = [
  "from-[#2a1f3d] via-[#1a2744] to-[#1a1d23]",
  "from-[#1a2744] via-[#243347] to-[#1a1d23]",
  "from-[#2d2a1f] via-[#2a2d35] to-[#1a1d23]",
  "from-[#1f2d2a] via-[#1a2744] to-[#1a1d23]",
  "from-[#2a2d35] via-[#1a1d23] to-[#2a1f3d]",
];

function TemplateCarousel({ templates: items }: { templates: typeof templates }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = Math.min(items.length, CAROUSEL_GRADIENTS.length);
  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 8000);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <div
      className="bento-card col-span-1 md:col-span-2 lg:row-span-2 relative overflow-hidden group flex flex-col min-h-[350px] lg:min-h-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stacked photo slides — crossfade */}
      <div className="flex-1 relative min-h-0">
        {items.slice(0, count).map((slide, i) => (
          <Link
            key={slide.id}
            href={`/dashboard/editor/${slide.id}`}
            className="absolute inset-0"
            style={{
              opacity: i === current ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
              pointerEvents: i === current ? "auto" : "none",
            }}
          >
            {slide.preview ? (
              <img src={slide.preview} alt={slide.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${CAROUSEL_GRADIENTS[i % CAROUSEL_GRADIENTS.length]}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            {!slide.preview && (
              <div className="absolute bottom-4 left-5 z-10">
                <p className="font-serif text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{slide.fields[1]?.defaultValue || slide.fields[0]?.defaultValue}</p>
              </div>
            )}
          </Link>
        ))}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center pointer-events-none z-10">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-[11px] font-medium text-white">
            Customize
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative flex items-center justify-between p-4">
        <div className="min-w-0 flex-1 relative h-10">
          {items.slice(0, count).map((slide, i) => (
            <div
              key={slide.id}
              className="absolute inset-0"
              style={{
                opacity: i === current ? 1 : 0,
                transition: "opacity 1.2s ease-in-out",
              }}
            >
              <p className="text-sm font-semibold text-text truncate">{slide.name}</p>
              <p className="text-[11px] text-text-secondary/50 mt-0.5">{slide.pillar}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            {items.slice(0, count).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === current ? "w-4 bg-accent" : "w-1.5 bg-white/15 hover:bg-white/25"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={prev} className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-all">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={next} className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-all">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [filter] = useState("All");

  const filtered = filter === "All" ? templates : templates.filter((t) => t.pillar === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <style>{`
        .qa-btn { background: transparent !important; color: rgba(255,255,255,0.45) !important; box-shadow: none !important; transition: all 0.3s; }
        .qa-btn:hover { color: #fff !important; }
        [data-qa="new-listing"]:hover { box-shadow: 0 0 12px #22c55e, 0 0 4px #22c55e !important; }
        [data-qa="just-sold"]:hover { box-shadow: 0 0 12px #3b82f6, 0 0 4px #3b82f6 !important; }
        [data-qa="holiday"]:hover { box-shadow: 0 0 12px #ef4444, 0 0 4px #ef4444 !important; }
        [data-qa="engage"]:hover { box-shadow: 0 0 12px #f97316, 0 0 4px #f97316 !important; }
        .ai-card { position: relative; }
        .ai-card .spline-bg { position: absolute; inset: 0; pointer-events: none; opacity: 0.6; }
        .ai-card .sketch-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        .ai-card .sketch-lines > div {
          position: absolute;
          inset: 0;
        }
        .ai-card .sketch-lines > div:last-child {
          transform: rotate(180deg);
        }
        .ai-card .sketch-lines svg {
          display: block;
          position: absolute;
          inset: 0;
          overflow: visible;
          fill: none;
          stroke-width: 1;
          stroke: #7cb8ff;
          width: 100%;
          height: 100%;
          stroke-dasharray: 2 10;
          stroke-dashoffset: 14;
          opacity: 0;
        }
        .ai-card .sketch-lines svg:nth-child(1) { stroke: rgba(160,210,255,0.9); }
        .ai-card .sketch-lines svg:nth-child(2) { stroke-width: 3px; filter: blur(16px); stroke: rgba(96,165,250,0.5); }
        .ai-card .sketch-lines svg:nth-child(3) { stroke-width: 2px; filter: blur(5px); stroke: rgba(130,190,255,0.6); }
        .ai-card .sketch-lines svg:nth-child(4) { stroke-width: 4px; filter: blur(40px); stroke: rgba(96,165,250,0.35); }
        .ai-card.start .sketch-lines svg {
          animation: sketch-stroke 2.4s ease-in-out;
        }
        @keyframes sketch-stroke {
          20%, 45% { opacity: 1; }
          100% { stroke-dashoffset: 4; opacity: 0; }
        }
        @media (max-width: 1023px) {
          .dash-grid { grid-auto-rows: auto; }
        }
      `}</style>
      {/* Main — bento container */}
      <main className="flex-1 flex flex-col overflow-hidden p-3 md:p-3 pb-1 md:pb-1">
        {/* Bento grid */}
        <div className="dash-grid flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_170px_1fr] gap-3 md:gap-4 overflow-y-auto lg:overflow-hidden">

          {/* Row 1: New Post hero (span 2) + Quick actions (span 1) + Calendar (span 1) */}

          {/* New Post — photo slideshow (manual) */}
          <NewPostSlideshow />

          {/* Quick Actions — frosted glass pills */}
          <div className="bento-card col-span-1 row-span-1 relative overflow-hidden flex flex-col p-4 min-h-[220px] md:min-h-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">Quick Actions</p>
            <div className="flex-1 flex flex-col gap-2">
              {[
                { label: "New Listing", color: "#22c55e", href: "/dashboard/editor/new-listing-photo", icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5M10.5 21H3m0 0V3.545M3 3.545l8.574-3.028a1.125 1.125 0 01.852 0L21 3.545" /></svg> },
                { label: "Just Sold", color: "#3b82f6", href: "/dashboard/editor/just-sold-photo", icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg> },
                { label: "Holiday", color: "#ef4444", href: "/dashboard/templates?pillar=Holiday", icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" /></svg> },
                { label: "Engage", color: "#f97316", href: "/dashboard/templates", icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg> },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  data-qa={item.label.toLowerCase().replace(/\s+/g, "-")}
                  className="qa-btn flex-1 rounded-2xl flex items-center gap-3 px-4 text-xs no-underline transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  style={{ border: `1px solid ${item.color}` }}
                >
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="bento-card col-span-1 row-span-1 p-4">
            <MiniCalendar />
          </div>

          {/* Row 2: Template Carousel (span 2 cols, 2 rows) + AI Assistant (span 1) + Stats (span 1) */}

          <TemplateCarousel templates={filtered} />

          {/* AI Assistant card */}
          <Link
            href="/dashboard/ai-assistant"
            className="ai-card bento-card col-span-1 row-span-1 p-5 flex flex-col justify-between group relative overflow-hidden lg:max-h-[180px]"
          >
            <SketchBorder />
            <div className="spline-bg">
              <WaveformCanvas />
            </div>
            <div className="relative z-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] mb-3">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-text">AI Assistant</h3>
              <p className="text-[11px] text-text-secondary/50 mt-1 leading-relaxed">Write captions, plan content, match your brand voice</p>
            </div>
            <div className="relative z-10 mt-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400/70 group-hover:text-blue-400 transition-colors">
                Ask anything
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </span>
            </div>
          </Link>

          {/* Stats / View All card */}
          <div className="bento-card col-span-1 row-span-1 p-4 flex flex-col justify-between lg:max-h-[170px] lg:overflow-hidden">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary/40 mb-2">Library</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary/60">Templates</span>
                  <span className="text-sm font-bold text-text">{templates.length}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary/60">Pillars</span>
                  <span className="text-sm font-bold text-text">{new Set(templates.map((t) => t.pillar)).size}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary/60">Photo slots</span>
                  <span className="text-sm font-bold text-text">{templates.filter((t) => t.hasPhotoSlot).length}</span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/templates"
              className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-text-secondary/50 hover:text-text transition-colors"
            >
              View All Templates
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>

          {/* Listing Videos — bottom right */}
          <VideoCarousel />

        </div>
      </main>
    </div>
  );
}
