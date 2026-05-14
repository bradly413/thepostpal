/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const STYLES = [
  { label: "Photo Realistic", icon: "📷", prompt: "photorealistic, high quality photography, natural lighting" },
  { label: "Luxury Real Estate", icon: "✨", prompt: "luxury real estate marketing photo, elegant, warm tones, professional photography" },
  { label: "Warm & Editorial", icon: "🌅", prompt: "warm editorial style, soft natural light, earth tones, magazine quality" },
  { label: "Modern Minimal", icon: "◻️", prompt: "clean modern minimalist design, white space, contemporary" },
  { label: "Watercolor", icon: "🎨", prompt: "beautiful watercolor painting style, soft edges, artistic" },
  { label: "Flat Illustration", icon: "🖼️", prompt: "flat vector illustration, clean lines, modern graphic design" },
];

const SIZES = [
  { value: "1:1", label: "Instagram Post", icon: "📸" },
  { value: "9:16", label: "Instagram Story", icon: "📱" },
  { value: "1:1", label: "Facebook Post", icon: "📘" },
  { value: "4:5", label: "Facebook Ad", icon: "📣" },
  { value: "16:9", label: "Facebook Cover", icon: "🖼️" },
];

const PROMPT_SUGGESTIONS = [
  "A middle class suburban home with tan siding and a landscaped front yard",
  "A photo for Fourth of July in St. Louis with fireworks over the Arch",
  "A living room with built-in bookshelves, a fireplace and a bay window with dark hardwood floors",
  "A glass shower in a white bathroom with marble tile floor and wall",
  "A cozy farmhouse kitchen with butcher block countertops and warm lighting",
  "A two-story brick home with a covered front porch and fall landscaping",
  "A freshly staged dining room with neutral tones and a modern chandelier",
  "A backyard patio with string lights, a fire pit and comfortable seating",
  "A bright open-concept living space with vaulted ceilings and large windows",
  "A front porch decorated for the holidays with wreaths and warm lights",
  "A master bedroom with soft gray walls, white bedding and a tufted headboard",
  "A ranch-style home with a three-car garage and a tree-lined street",
  "A finished basement with a bar area, recessed lighting and vinyl plank floors",
  "A spring garden with blooming flowers and a charming stone walkway",
  "A mudroom entryway with built-in cubbies, hooks and a storage bench",
];


interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export default function CreatorStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(null);
  const [refImage, setRefImage] = useState<{ data: string; name: string } | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [openMenu, setOpenMenu] = useState<"style" | "aspect" | null>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [suggestionFade, setSuggestionFade] = useState(true);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [slideIn, setSlideIn] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const closeMenus = useCallback(() => {
    setOpenMenu(null);
    setShowRefPicker(false);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) closeMenus();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [closeMenus]);

  useEffect(() => {
    if (prompt) return;
    const interval = setInterval(() => {
      setSuggestionFade(false);
      setTimeout(() => {
        setSuggestionIdx((i) => (i + 1) % PROMPT_SUGGESTIONS.length);
        setSuggestionFade(true);
      }, 1200);
    }, 7000);
    return () => clearInterval(interval);
  }, [prompt]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRefImage({ data: reader.result as string, name: file.name });
      setShowRefPicker(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function selectBrandPhoto(src: string) {
    const res = await fetch(src);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = () => {
      setRefImage({ data: reader.result as string, name: src.split("/").pop() || "brand-photo" });
      setShowRefPicker(false);
    };
    reader.readAsDataURL(blob);
  }

  async function handleEnhance() {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
    } catch { /* silent fail */ }
    setEnhancing(false);
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    const fullPrompt = prompt.trim() + `. Style: ${STYLES[style].prompt}`;
    setLoading(true);
    setError("");
    closeMenus();
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, aspectRatio: SIZES[sizeIdx].value, referenceImage: refImage?.data || null }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Generation failed"); return; }
      const img: GeneratedImage = { url: data.image, prompt: prompt.trim(), timestamp: Date.now() };
      setGenerated((prev) => [img, ...prev]);
      setActiveImage(img);
      setCarouselIdx(0);
      setPrompt("");
      setSlideIn(true);
      setTimeout(() => setSlideIn(false), 600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = prompt.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <style>{`
        @keyframes silk-wave-1 {
          0%   { transform: translate(0%, 0%) rotate(0deg) scale(1, 1); }
          20%  { transform: translate(8%, -5%) rotate(2deg) scale(1.15, 0.9); }
          40%  { transform: translate(-4%, 8%) rotate(-1.5deg) scale(0.95, 1.1); }
          60%  { transform: translate(6%, 3%) rotate(1deg) scale(1.08, 0.95); }
          80%  { transform: translate(-6%, -4%) rotate(-2deg) scale(0.92, 1.08); }
          100% { transform: translate(0%, 0%) rotate(0deg) scale(1, 1); }
        }
        @keyframes silk-wave-2 {
          0%   { transform: translate(0%, 0%) rotate(0deg) scale(1, 1); }
          25%  { transform: translate(-10%, 6%) rotate(-2.5deg) scale(1.12, 0.88); }
          50%  { transform: translate(5%, -7%) rotate(1.5deg) scale(0.9, 1.15); }
          75%  { transform: translate(-3%, 4%) rotate(-1deg) scale(1.06, 0.96); }
          100% { transform: translate(0%, 0%) rotate(0deg) scale(1, 1); }
        }
        @keyframes silk-wave-3 {
          0%   { transform: translate(0%, 0%) rotate(0deg) scale(1, 1); }
          33%  { transform: translate(7%, 5%) rotate(1.8deg) scale(0.88, 1.18); }
          66%  { transform: translate(-8%, -3%) rotate(-2.2deg) scale(1.14, 0.86); }
          100% { transform: translate(0%, 0%) rotate(0deg) scale(1, 1); }
        }
        @keyframes silk-wave-4 {
          0%   { transform: translate(0%, 0%) skewX(0deg) scale(1); }
          25%  { transform: translate(5%, -8%) skewX(3deg) scale(1.1); }
          50%  { transform: translate(-6%, 5%) skewX(-2deg) scale(0.92); }
          75%  { transform: translate(3%, 6%) skewX(1.5deg) scale(1.05); }
          100% { transform: translate(0%, 0%) skewX(0deg) scale(1); }
        }
        @keyframes silk-sheen {
          0%   { opacity: 0.02; transform: translateX(-20%) skewX(-8deg) scaleY(0.8); }
          30%  { opacity: 0.08; transform: translateX(-5%) skewX(-3deg) scaleY(1.1); }
          50%  { opacity: 0.05; transform: translateX(10%) skewX(2deg) scaleY(0.9); }
          70%  { opacity: 0.09; transform: translateX(20%) skewX(5deg) scaleY(1.05); }
          100% { opacity: 0.02; transform: translateX(-20%) skewX(-8deg) scaleY(0.8); }
        }
        .cs-silk-base {
          background-image:
            radial-gradient(ellipse 130% 90% at 25% 45%, rgba(255,255,255,0.03) 0%, transparent 50%),
            radial-gradient(ellipse 90% 130% at 75% 35%, rgba(255,255,255,0.02) 0%, transparent 45%),
            radial-gradient(ellipse 100% 70% at 50% 80%, rgba(212,168,83,0.018) 0%, transparent 50%),
            linear-gradient(160deg, rgba(14,14,14,1) 0%, rgba(6,6,6,1) 40%, rgba(10,9,8,1) 100%);
        }
        .cs-silk-w1 {
          background-image:
            radial-gradient(ellipse 180% 35% at 15% 45%, rgba(255,255,255,0.04) 0%, transparent 55%),
            radial-gradient(ellipse 60% 160% at 85% 55%, rgba(212,168,83,0.025) 0%, transparent 50%);
          animation: silk-wave-1 16s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .cs-silk-w2 {
          background-image:
            radial-gradient(ellipse 50% 180% at 65% 25%, rgba(255,255,255,0.03) 0%, transparent 50%),
            radial-gradient(ellipse 170% 40% at 35% 70%, rgba(200,180,150,0.025) 0%, transparent 50%);
          animation: silk-wave-2 20s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .cs-silk-w3 {
          background-image:
            radial-gradient(ellipse 140% 50% at 45% 50%, rgba(255,255,255,0.025) 0%, transparent 48%),
            radial-gradient(ellipse 45% 140% at 55% 45%, rgba(180,160,130,0.02) 0%, transparent 42%);
          animation: silk-wave-3 14s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .cs-silk-w4 {
          background-image:
            radial-gradient(ellipse 160% 45% at 50% 35%, rgba(255,255,255,0.02) 0%, transparent 50%),
            radial-gradient(ellipse 70% 150% at 40% 65%, rgba(212,168,83,0.015) 0%, transparent 45%);
          animation: silk-wave-4 24s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .cs-silk-sheen {
          background-image: linear-gradient(108deg, transparent 25%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 62%, transparent 75%);
          animation: silk-sheen 14s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .cs-card-idle { background-image: linear-gradient(to bottom, rgba(25,25,25,1), rgba(17,17,17,1)); border-color: rgba(255,255,255,0.08); box-shadow: 0 0 0 1px rgba(39,39,39,0.4) inset, 0 4px 12px rgba(0,0,0,0.4), 0 25px 50px -12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03) inset; }
        @keyframes gen-border {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .cs-gen-border {
          background-image: linear-gradient(90deg,
            #fb0094, #0000ff, #00ff00, #ffff00, #ff0000,
            #fb0094, #0000ff, #00ff00, #ffff00, #ff0000);
          background-size: 200%;
          animation: gen-border 10s linear infinite;
        }
        .cs-gen-glow {
          filter: blur(40px);
          opacity: 0.45;
        }
        .cs-ambilight {
          position: relative;
          display: inline-block;
        }
        .cs-ambilight-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          filter: blur(3.5vw);
          transform: scale(1.12);
          opacity: 0.5;
          transition: opacity 0.6s ease;
          pointer-events: none;
          z-index: 0;
        }
        .cs-ambilight:hover .cs-ambilight-glow {
          opacity: 0.75;
          transform: scale(1.18);
        }
        .cs-carousel-slide {
          position: absolute;
          inset: 0;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .cs-slide-in {
          animation: slide-in-right 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .cs-img-hover {
          position: relative;
          overflow: hidden;
        }
        .cs-img-hover .cs-hover-grad {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
          z-index: 5;
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        .cs-img-hover:hover .cs-hover-grad {
          opacity: 1;
        }
        .cs-img-actions {
          position: absolute;
          bottom: 16px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 24px;
          z-index: 6;
          pointer-events: none;
        }
        .cs-img-actions button {
          opacity: 0;
          transform: translateY(12px);
          transition: all 0.3s ease;
          pointer-events: none;
        }
        .cs-img-hover:hover .cs-img-actions button {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .cs-img-hover:hover .cs-img-actions button:nth-child(1) { transition-delay: 0.04s; }
        .cs-img-hover:hover .cs-img-actions button:nth-child(2) { transition-delay: 0.08s; }
        .cs-img-hover:hover .cs-img-actions button:nth-child(3) { transition-delay: 0.12s; }
        .cs-img-hover:hover .cs-img-actions button:nth-child(4) { transition-delay: 0.16s; }
      `}</style>
      {/* SVG filter for wavy distortion */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="silk-warp" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="4" seed="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="120" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="silk-warp-2" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.014" numOctaves="3" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="90" xChannelSelector="G" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>
      {/* Silk background layers */}
      <div className="absolute inset-0 cs-silk-base" />
      <div className="absolute -inset-[20%] pointer-events-none cs-silk-w1" style={{ filter: "url(#silk-warp)" }} />
      <div className="absolute -inset-[20%] pointer-events-none cs-silk-w2" style={{ filter: "url(#silk-warp-2)" }} />
      <div className="absolute -inset-[20%] pointer-events-none cs-silk-w3" style={{ filter: "url(#silk-warp)" }} />
      <div className="absolute -inset-[20%] pointer-events-none cs-silk-w4" style={{ filter: "url(#silk-warp-2)" }} />
      <div className="absolute -inset-[20%] pointer-events-none cs-silk-sheen" style={{ filter: "url(#silk-warp)" }} />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative z-10">

        {/* Generated image display */}
        {error ? (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/15 px-6 py-5 max-w-sm mb-10 text-center">
            <p className="text-sm text-red-400/80">{error}</p>
            <button onClick={() => setError("")} className="text-xs text-red-400/40 mt-3 hover:text-red-400 transition-colors">Dismiss</button>
          </div>
        ) : loading && generated.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mb-8">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5} className="animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm text-text-secondary/35 font-medium">Creating your image...</p>
          </div>
        ) : (activeImage || loading) ? (
          <div className="mb-10 max-w-sm w-full cs-ambilight">
            {/* Ambilight glow */}
            <img
              src={(activeImage || generated[0])?.url}
              alt=""
              className="cs-ambilight-glow rounded-2xl transition-opacity duration-700"
              style={{ opacity: loading ? 0.2 : undefined }}
            />
            {/* Carousel */}
            <div className="relative z-[2] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40">
              <div className="relative overflow-hidden" style={{ aspectRatio: "1" }}>
                {generated.map((img, i) => {
                  const isActive = i === carouselIdx;
                  const isSliding = slideIn && i === 0;
                  let tx = "0%";
                  if (!isActive && !isSliding) {
                    tx = i < carouselIdx ? "-100%" : "100%";
                  }
                  return (
                    <div
                      key={img.timestamp}
                      className={`cs-carousel-slide cs-img-hover ${isSliding ? "cs-slide-in" : ""}`}
                      style={{
                        transform: isSliding ? undefined : `translateX(${tx})`,
                        zIndex: isActive || isSliding ? 2 : 0,
                      }}
                    >
                      <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                      {!loading && isActive && (
                        <>
                          <div className="cs-hover-grad" />
                          <div className="cs-img-actions">
                            <button
                              onClick={(e) => { e.stopPropagation(); const a = document.createElement("a"); a.href = img.url; a.download = `creator-${img.timestamp}.png`; a.click(); }}
                              className="flex flex-col items-center gap-1.5 text-white/90 hover:text-accent"
                              title="Download"
                            >
                              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                              <span className="text-[10px] font-medium">Download</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); }}
                              className="flex flex-col items-center gap-1.5 text-white/90 hover:text-accent"
                              title="Template"
                            >
                              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                              <span className="text-[10px] font-medium">Template</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); }}
                              className="flex flex-col items-center gap-1.5 text-white/90 hover:text-accent"
                              title="Edit"
                            >
                              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM16.862 4.487L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                              <span className="text-[10px] font-medium">Edit</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setGenerated((prev) => prev.filter((g) => g.timestamp !== img.timestamp)); if (generated.length <= 1) { setActiveImage(null); } else { const next = generated.find((g) => g.timestamp !== img.timestamp); if (next) { setActiveImage(next); setCarouselIdx(0); } } }}
                              className="flex flex-col items-center gap-1.5 text-white/90 hover:text-red-400"
                              title="Delete"
                            >
                              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                              <span className="text-[10px] font-medium">Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {/* Dim overlay when loading */}
                {loading && (
                  <div className="absolute inset-0 z-10 bg-black/50 flex flex-col items-center justify-center gap-3 transition-opacity duration-700">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5} className="animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p className="text-sm text-text-secondary/60 font-medium">Creating your image...</p>
                  </div>
                )}
              </div>
              {/* Nav arrows */}
              {generated.length > 1 && !loading && (
                <>
                  <button
                    onClick={() => { const prev = (carouselIdx - 1 + generated.length) % generated.length; setCarouselIdx(prev); setActiveImage(generated[prev]); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>
                  <button
                    onClick={() => { const next = (carouselIdx + 1) % generated.length; setCarouselIdx(next); setActiveImage(generated[next]); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </>
              )}
              {/* Indicators */}
              {generated.length > 1 && !loading && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                  {generated.map((img, i) => (
                    <button
                      key={img.timestamp}
                      onClick={() => { setCarouselIdx(i); setActiveImage(generated[i]); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === carouselIdx ? "bg-white w-4" : "bg-white/40 hover:bg-white/70"}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Caption & Save */}
            {!loading && activeImage && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-[11px] text-text-secondary/35 truncate flex-1 mr-4">{activeImage.prompt}</p>
                <a
                  href={activeImage.url}
                  download={`creator-${activeImage.timestamp}.png`}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary/40 hover:text-accent transition-colors"
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Save
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/8 mb-5">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-text font-heading">
              Create with AI
            </h1>
            <p className="text-sm text-text-secondary/30 mt-2">Describe an image and let Gemini bring it to life</p>
          </div>
        )}

        {/* Prompt card */}
        <div ref={cardRef} className="w-full max-w-xl">
          <div className={`relative rounded-2xl ${loading ? "p-[2px]" : ""}`}>
            {/* Animated gradient border when generating */}
            {loading && (
              <>
                <div className="absolute inset-0 rounded-2xl cs-gen-border z-0" />
                <div className="absolute inset-0 rounded-2xl cs-gen-border cs-gen-glow z-0" />
              </>
            )}
          <div className={`rounded-2xl border backdrop-blur-sm cs-card-idle ${loading ? "relative z-10" : ""}`}>

            {/* Reference image row */}
            {(refImage || showRefPicker) && (
              <div className="px-4 pt-3 pb-0">
                {refImage && !showRefPicker && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.06] pl-1.5 pr-3 py-1.5">
                    <img src={refImage.data} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-text-secondary/60 max-w-[120px] truncate">{refImage.name}</span>
                      <span className="text-[9px] text-text-secondary/30">Reference image</span>
                    </div>
                    <button onClick={() => setRefImage(null)} className="ml-1 p-0.5 rounded-md text-text-secondary/30 hover:text-text hover:bg-white/10 transition-all">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                {showRefPicker && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 mb-1">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-text-secondary/35 font-medium">Reference Image</p>
                    </div>
                    <button
                      onClick={() => { fileRef.current?.click(); }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.1] hover:border-accent/40 py-4 text-xs text-text-secondary/50 hover:text-accent transition-all"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Upload a reference photo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Textarea */}
            <div className="relative px-4 pt-3 pb-2">
              {!prompt && (
                <div
                  className="absolute inset-x-4 top-3 pointer-events-none text-[14px] leading-relaxed transition-opacity duration-[1200ms] ease-in-out"
                  style={{ opacity: suggestionFade ? 0.3 : 0 }}
                >
                  {PROMPT_SUGGESTIONS[suggestionIdx]}
                  <span className="text-[10px] text-text-secondary/15 ml-2">Tab</span>
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && !prompt) { e.preventDefault(); setPrompt(PROMPT_SUGGESTIONS[suggestionIdx]); }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
                }}
                rows={3}
                className="w-full bg-transparent text-[14px] text-text focus:outline-none resize-none leading-relaxed relative z-10 transition-opacity duration-700"
                style={{ textShadow: "0 -1px 0 rgba(0,0,0,0.3)", opacity: loading ? 0.15 : 1 }}
              />
              {prompt.trim() && (
                <button
                  onClick={handleEnhance}
                  disabled={enhancing}
                  title="Enhance prompt with AI"
                  className={`absolute right-4 top-3 p-2 rounded-xl transition-all ${
                    enhancing
                      ? "text-accent bg-accent/10 animate-pulse"
                      : "text-text-secondary/25 hover:text-accent hover:bg-accent/8"
                  }`}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-white/[0.04]" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.03)" }} />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-1">
                {/* Reference image button */}
                <button
                  onClick={() => { setShowRefPicker(!showRefPicker); setOpenMenu(null); }}
                  className={`p-2 rounded-xl transition-all ${
                    showRefPicker || refImage
                      ? "text-accent bg-accent/10"
                      : "text-text-secondary/30 hover:text-text-secondary/60 hover:bg-white/5"
                  }`}
                  title="Add reference image"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </button>

                {/* Style selector */}
                <div className="relative">
                  <button
                    onClick={() => { setOpenMenu(openMenu === "style" ? null : "style"); setShowRefPicker(false); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                      openMenu === "style"
                        ? "text-text bg-white/10"
                        : "text-text-secondary/40 hover:text-text-secondary/60 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-[13px]">{STYLES[style].icon}</span>
                    {STYLES[style].label}
                    <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${openMenu === "style" ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {openMenu === "style" && (
                    <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-white/[0.1] bg-[#1a1a1a] p-1 shadow-2xl shadow-black/60 z-50">
                      {STYLES.map((s, i) => (
                        <button
                          key={s.label}
                          onClick={() => { setStyle(i); setOpenMenu(null); }}
                          className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all ${
                            i === style ? "bg-white/[0.08] text-text" : "text-text-secondary/50 hover:text-text hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="text-[14px]">{s.icon}</span>
                          {s.label}
                          {i === style && (
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={2.5} className="ml-auto"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px h-4 bg-white/[0.06] mx-0.5" />

                {/* Size selector */}
                <div className="relative">
                  <button
                    onClick={() => { setOpenMenu(openMenu === "aspect" ? null : "aspect"); setShowRefPicker(false); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                      openMenu === "aspect"
                        ? "text-text bg-white/10"
                        : "text-text-secondary/40 hover:text-text-secondary/60 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-[13px]">{SIZES[sizeIdx].icon}</span>
                    {SIZES[sizeIdx].label}
                    <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${openMenu === "aspect" ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {openMenu === "aspect" && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-white/[0.1] bg-[#1a1a1a] p-1 shadow-2xl shadow-black/60 z-50">
                      {SIZES.map((s, i) => (
                        <button
                          key={s.label}
                          onClick={() => { setSizeIdx(i); setOpenMenu(null); }}
                          className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all ${
                            i === sizeIdx ? "bg-white/[0.08] text-text" : "text-text-secondary/50 hover:text-text hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="text-[13px]">{s.icon}</span>
                          {s.label}
                          <span className="ml-auto text-[10px] text-text-secondary/25">{s.value}</span>
                          {i === sizeIdx && (
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={2.5} className="shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px h-4 bg-white/[0.06] mx-0.5" />

                {/* Model badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-text-secondary/25">
                  <span className="font-bold text-accent-cyan/50">G</span>
                  Gemini
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`rounded-xl px-5 py-2 text-[12px] font-semibold transition-all flex items-center gap-2 ${
                  canGenerate
                    ? "bg-accent text-bg hover:bg-accent/90 active:scale-[0.97] shadow-lg shadow-accent/20"
                    : "bg-white/[0.04] text-text-secondary/15 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <svg width="12" height="12" className="animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                    Generating
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
          </div>

          {/* Keyboard hint */}
          {prompt.trim() && !loading && (
            <p className="text-center text-[10px] text-text-secondary/15 mt-3">Enter to generate</p>
          )}
        </div>
      </div>

      {/* Gallery strip */}
      {generated.length > 0 && (
        <div className="border-t border-white/[0.05] px-6 py-3 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-text-secondary/20 shrink-0 font-medium">Recent</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {generated.map((img, i) => (
                <button
                  key={img.timestamp}
                  onClick={() => { setActiveImage(img); setCarouselIdx(i); }}
                  className={`shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImage?.timestamp === img.timestamp ? "border-accent shadow-lg shadow-accent/20" : "border-transparent opacity-60 hover:opacity-100 hover:border-white/15"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
