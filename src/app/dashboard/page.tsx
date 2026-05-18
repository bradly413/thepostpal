"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import WaveformCanvas from "@/components/WaveformCanvas";
import AuroraCanvas from "@/components/AuroraCanvas";
import { templates } from "@/lib/templates";
import { formatDuration, getThumbnail, getVideoId } from "@/lib/vimeo";
import type { VimeoVideo, VimeoListResponse } from "@/lib/vimeo";

const FALLBACK_VIDEOS = [
  { src: "", title: "Virtual Tour: West County Colonial", duration: "2:45" },
  { src: "", title: "Listing Walkthrough: Chesterfield", duration: "3:12" },
  { src: "", title: "Neighborhood Spotlight: Kirkwood", duration: "1:58" },
];

const AI_PROMPTS = [
  "Make a post for Father’s Day",
  "Schedule a Facebook post for this Saturday",
  "Make a post for my new listing",
  "Create an Instagram post for Memorial Day Weekend",
  "Write a caption for my just sold photo",
  "Plan my social media for next week",
  "Create an engagement post for my neighborhood",
];

function AiAssistantCard() {
  const router = useRouter();
  const [promptIndex, setPromptIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userInput) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setPromptIndex((i) => (i + 1) % AI_PROMPTS.length);
        setFading(false);
      }, 900);
    }, 5000);
    return () => clearInterval(interval);
  }, [userInput]);

  const handleSubmit = () => {
    const text = userInput.trim();
    if (!text) return;
    setGenerating(true);
    setTimeout(() => {
      router.push(`/dashboard/ai-assistant?prompt=${encodeURIComponent(text)}`);
    }, 1200);
  };

  return (
    <div
      className={`ai-card col-span-1 md:col-span-2 row-span-1 group relative ${generating ? "p-[2px]" : ""}`}
      style={{ borderRadius: 24 }}
    >
      {generating && (
        <>
          <div className="absolute inset-0 rounded-[24px] ai-gen-border" />
          <div className="absolute inset-0 rounded-[24px] ai-gen-border ai-gen-glow" />
        </>
      )}
      <div
        className={`relative w-full h-full overflow-hidden rounded-[22px] ${generating ? "" : "bento-card"}`}
        style={{ padding: 0 }}
      >
        <div className="ai-video-bg absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute w-full h-full object-cover"
            style={{ opacity: 0.5 }}
            src="/videos/ai-aurora.webm"
          />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.85) 100%)" }} />
        </div>
        <div className="ai-light-aurora">
          <div className="ai-light-aurora-bg" />
          <div className="ai-light-aurora-fade" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-blue-400 shrink-0" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-xs font-semibold text-text">AI Assistant</span>
            <span className="text-[10px] text-text-secondary/40 hidden sm:inline">—</span>
            <span className="text-[10px] text-text-secondary/40 hidden sm:inline">Write captions, plan content, match your brand voice</span>
          </div>
          <div className="flex-1 flex items-center px-4 pb-4">
            <div className="ai-prompt-input w-full flex items-center gap-4 rounded-2xl px-5 py-4 transition-all">
              <div className="flex-1 relative" style={{ height: "1.4em" }}>
                {!userInput && !generating && (
                  <span
                    className="ai-prompt-suggestion absolute inset-0 truncate pointer-events-none"
                    style={{ opacity: fading ? 0 : 1, transition: "opacity 0.9s ease" }}
                  >
                    {AI_PROMPTS[promptIndex]}
                  </span>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  disabled={generating}
                  aria-label="Ask AI Assistant"
                  className="absolute inset-0 w-full text-[15px] bg-transparent border-none outline-none ai-prompt-text z-10"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={generating}
                className="ai-prompt-btn flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                {generating ? (
                  <svg width="16" height="16" className="animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
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
              <img src={video.src} alt={video.title} width={320} height={180} className="absolute inset-0 w-full h-full object-cover saturate-[0.85] contrast-[1.05] brightness-[0.95]" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744] via-[#2a2d35] to-[#1a1d23]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <button
              className="absolute inset-0 flex items-center justify-center"
              onClick={() => video.vimeoId && setPlaying(video.vimeoId)}
              aria-label="Play video"
            >
              <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                  i === current ? "w-4 bg-accent" : "w-1.5 bg-white/15 hover:bg-white/25"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={prev} aria-label="Previous slide" className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={next} aria-label="Next slide" className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-colors">
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
          role="dialog"
          aria-modal="true"
          aria-label="Video player"
        >
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.08] bg-black">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{slides[current]?.title}</p>
              <button
                onClick={() => setPlaying(null)}
                aria-label="Close video"
                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
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
                title="Video player"
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
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const monthName = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setCalMonth((m) => {
      if (m === 0) { setCalYear((y) => y - 1); return 11; }
      return m - 1;
    });
  };
  const nextMonth = () => {
    setCalMonth((m) => {
      if (m === 11) { setCalYear((y) => y + 1); return 0; }
      return m + 1;
    });
  };

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isCurrentMonth = calMonth === todayMonth && calYear === todayYear;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text">{monthName}</p>
        <div className="flex gap-1">
          <button onClick={prevMonth} aria-label="Previous month" className="p-1 rounded-lg text-text-secondary hover:text-text transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={nextMonth} aria-label="Next month" className="p-1 rounded-lg text-text-secondary hover:text-text transition-colors">
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
                : isCurrentMonth && day === todayDate
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
  { src: "/previews/new-listing.png", label: "New Listing Post" },
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
            {slide.src ? (
              <img src={slide.src} alt={slide.label} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1d23] via-[#2a2d35] to-[#1a1d23]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
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
              <Link href="/dashboard/templates" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-colors">
                Get started
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      aria-label={`Slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                        i === current ? "w-3.5 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-0.5">
                  <button onClick={prev} aria-label="Previous slide" className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>
                  <button onClick={next} aria-label="Next slide" className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors">
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
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                  i === current ? "w-4 bg-accent" : "w-1.5 bg-white/15 hover:bg-white/25"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={prev} aria-label="Previous slide" className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button onClick={next} aria-label="Next slide" className="p-1.5 rounded-lg text-text-secondary/40 hover:text-text hover:bg-white/5 transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  useEffect(() => { document.title = "Dashboard — Posterboy Social"; }, []);
  const [filter] = useState("All");

  const filtered = filter === "All" ? templates : templates.filter((t) => t.pillar === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <h1 className="sr-only">Dashboard</h1>
      <style>{`
        .qa-btn { background: transparent !important; color: rgba(255,255,255,0.45) !important; box-shadow: none !important; transition: all 0.3s; }
        .qa-btn:hover { color: #fff !important; }
        [data-qa="new-listing"]:hover { box-shadow: 0 0 12px #22c55e, 0 0 4px #22c55e !important; }
        [data-qa="just-sold"]:hover { box-shadow: 0 0 12px #3b82f6, 0 0 4px #3b82f6 !important; }
        [data-qa="holiday"]:hover { box-shadow: 0 0 12px #ef4444, 0 0 4px #ef4444 !important; }
        [data-qa="engage"]:hover { box-shadow: 0 0 12px #f97316, 0 0 4px #f97316 !important; }
        .ai-card { position: relative; }
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

          {/* Brand Setup / Quick Actions */}
          <Link
            href="/onboarding"
            className="bento-card col-span-1 row-span-1 relative overflow-hidden flex flex-col p-5 min-h-[220px] md:min-h-0 no-underline group/brand cursor-pointer hover:border-accent/30 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-transparent to-transparent opacity-0 group-hover/brand:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Brand Setup</p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-base font-semibold text-text font-heading mb-1.5">Set up your brand</h3>
                <p className="text-xs text-text-secondary/60 leading-relaxed">
                  Meet Posterboy — answer a few questions and we&apos;ll build your brand book, templates, and voice in about two minutes.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/25 px-3 py-1.5 text-[11px] font-medium text-accent group-hover/brand:bg-accent/25 transition-colors">
                  Get started
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </span>
                <span className="text-[10px] text-text-secondary/30">~2 min</span>
              </div>
            </div>
          </Link>

          {/* Calendar */}
          <div className="bento-card col-span-1 row-span-1 p-4">
            <MiniCalendar />
          </div>

          {/* Row 2: Template Carousel (span 2 cols, 2 rows) + AI Assistant (span 1) + Stats (span 1) */}

          <TemplateCarousel templates={filtered} />

          {/* AI Assistant card */}
          <AiAssistantCard />

          {/* Listing Videos — bottom right */}
          <VideoCarousel />

        </div>
      </main>
    </div>
  );
}
