"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { templates } from "@/lib/templates";
import SocialMockup, { type Platform } from "@/components/SocialMockup";
import { detectPlatform, extractCaption, extractHashtags, stripHashtagsFromCaption } from "@/lib/social-detect";
import { pickMockupImage } from "@/lib/mockup-library";
import { SITE_NAME } from "@/lib/site";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface GeneratedPost {
  platform: Platform;
  caption: string | null;
  hashtags: string | null;
  imageUrl: string | null;
  rawContent: string;
  timestamp: number;
  templateId: string | null;
}

const TEMPLATE_KEYWORDS: [string[], string, string][] = [
  [["new listing", "just listed"], "new-listing-photo", "New Listing"],
  [["just sold", "sold home", "closing day"], "just-sold-photo", "Just Sold"],
  [["market update", "market stats", "market report"], "market-stats", "Market Stats"],
  [["open house", "event", "festival"], "event-spotlight", "Event Spotlight"],
  [["neighborhood", "community spotlight"], "neighborhood-guide", "Neighborhood Guide"],
  [["tips", "checklist", "buyer tips", "seller tips"], "ivory-checklist", "Tips & Checklist"],
];

function detectTemplate(prompt: string): { id: string; name: string } | null {
  const lower = prompt.toLowerCase();
  for (const [keywords, id, name] of TEMPLATE_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return { id, name };
  }
  return null;
}

const PROMPT_SUGGESTIONS = [
  "Write an Instagram caption for a new listing in West County with 4 beds and a big backyard",
  "Give me 5 content ideas for this week mixing listings, tips, and community posts",
  "Suggest hashtags for a just-sold post in Chesterfield, Missouri",
  "Write a Facebook post celebrating a client closing on their first home",
  "Create an engaging story sequence for an open house this weekend",
  "Suggest 3 neighborhood spotlight posts for the St. Louis suburbs",
  "Draft a market update post about spring housing trends in Missouri",
  "Write a warm holiday greeting post for my real estate followers",
  "Give me caption ideas for before-and-after home staging photos",
  "Write an engaging bio update for my Instagram real estate profile",
  "Plan my social media content for Monday through Friday this week",
  "Write a LinkedIn post about the importance of staging your home",
];

export default function AIAssistantPage() {
  return (
    <Suspense>
      <AIAssistantInner />
    </Suspense>
  );
}

function AIAssistantInner() {
  useEffect(() => { document.title = `AI Assistant | ${SITE_NAME}`; }, []);
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [suggestionFade, setSuggestionFade] = useState(true);
  const [activePost, setActivePost] = useState<GeneratedPost | null>(null);
  const [slideIn, setSlideIn] = useState(false);
  const [history, setHistory] = useState<GeneratedPost[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const initialPromptHandled = useRef(false);
  const lastPlatformRef = useRef<Platform | null>(null);

  useEffect(() => {
    if (input || activePost) return;
    const interval = setInterval(() => {
      setSuggestionFade(false);
      setTimeout(() => {
        setSuggestionIdx((i) => (i + 1) % PROMPT_SUGGESTIONS.length);
        setSuggestionFade(true);
      }, 1200);
    }, 7000);
    return () => clearInterval(interval);
  }, [input, activePost]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: content.trim(), timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setLoading(false); return; }
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: data.message, timestamp: new Date() };
      setMessages([...newMessages, assistantMsg]);

      const detected = detectPlatform(content);
      const platform = detected ?? lastPlatformRef.current;
      if (platform) {
        lastPlatformRef.current = platform;
        const rawCaption = extractCaption(data.message);
        const hashtags = extractHashtags(data.message);
        const caption = rawCaption && hashtags ? stripHashtagsFromCaption(rawCaption) : rawCaption;
        const imageUrl = pickMockupImage(content);
        const matched = detectTemplate(content);
        const post: GeneratedPost = {
          platform,
          caption,
          hashtags,
          imageUrl,
          rawContent: data.message,
          timestamp: Date.now(),
          templateId: matched?.id ?? null,
        };
        setHistory((prev) => [post, ...prev]);
        setActivePost(post);
        setSlideIn(true);
        setTimeout(() => setSlideIn(false), 600);
      } else {
        setActivePost(null);
      }
    } catch {
      setError("Failed to connect. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  useEffect(() => {
    if (initialPromptHandled.current) return;
    const prompt = searchParams.get("prompt");
    if (prompt && !messages.length && !loading) {
      initialPromptHandled.current = true;
      setInput(prompt);
      sendMessage(prompt);
    }
  }, [searchParams, messages.length, loading, sendMessage]);

  const lastAssistant = messages.filter((m) => m.role === "assistant").at(-1);

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
        .ai-silk-base {
          background-image:
            radial-gradient(ellipse 130% 90% at 25% 45%, rgba(255,255,255,0.03) 0%, transparent 50%),
            radial-gradient(ellipse 90% 130% at 75% 35%, rgba(255,255,255,0.02) 0%, transparent 45%),
            radial-gradient(ellipse 100% 70% at 50% 80%, rgba(212,168,83,0.018) 0%, transparent 50%),
            linear-gradient(160deg, rgba(14,14,14,1) 0%, rgba(6,6,6,1) 40%, rgba(10,9,8,1) 100%);
        }
        .ai-silk-w1 {
          background-image:
            radial-gradient(ellipse 180% 35% at 15% 45%, rgba(255,255,255,0.04) 0%, transparent 55%),
            radial-gradient(ellipse 60% 160% at 85% 55%, rgba(212,168,83,0.025) 0%, transparent 50%);
          animation: silk-wave-1 16s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .ai-silk-w2 {
          background-image:
            radial-gradient(ellipse 50% 180% at 65% 25%, rgba(255,255,255,0.03) 0%, transparent 50%),
            radial-gradient(ellipse 170% 40% at 35% 70%, rgba(200,180,150,0.025) 0%, transparent 50%);
          animation: silk-wave-2 20s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .ai-silk-w3 {
          background-image:
            radial-gradient(ellipse 140% 50% at 45% 50%, rgba(255,255,255,0.025) 0%, transparent 48%),
            radial-gradient(ellipse 45% 140% at 55% 45%, rgba(180,160,130,0.02) 0%, transparent 42%);
          animation: silk-wave-3 14s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .ai-silk-w4 {
          background-image:
            radial-gradient(ellipse 160% 45% at 50% 35%, rgba(255,255,255,0.02) 0%, transparent 50%),
            radial-gradient(ellipse 70% 150% at 40% 65%, rgba(212,168,83,0.015) 0%, transparent 45%);
          animation: silk-wave-4 24s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .ai-silk-sheen {
          background-image: linear-gradient(108deg, transparent 25%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 62%, transparent 75%);
          animation: silk-sheen 14s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .ai-card-idle {
          background-image: linear-gradient(to bottom, rgba(25,25,25,1), rgba(17,17,17,1));
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 1px rgba(39,39,39,0.4) inset, 0 4px 12px rgba(0,0,0,0.4), 0 25px 50px -12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03) inset;
        }
        @keyframes gen-border {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .ai-gen-border {
          background-image: linear-gradient(90deg,
            #fb0094, #0000ff, #00ff00, #ffff00, #ff0000,
            #fb0094, #0000ff, #00ff00, #ffff00, #ff0000);
          background-size: 200%;
          animation: gen-border 10s linear infinite;
        }
        .ai-gen-glow {
          filter: blur(40px);
          opacity: 0.45;
        }
        @keyframes slide-in-right {
          from { transform: translateX(60px) scale(0.97); opacity: 0; }
          to   { transform: translateX(0) scale(1); opacity: 1; }
        }
        .ai-slide-in {
          animation: slide-in-right 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ai-mockup-scroll::-webkit-scrollbar { display: none; }
        .ai-mockup-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        [data-theme="light"] .ai-silk-base {
          background-image:
            radial-gradient(ellipse 130% 90% at 25% 45%, rgba(212,168,83,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 90% 130% at 75% 35%, rgba(212,168,83,0.04) 0%, transparent 45%),
            linear-gradient(160deg, #F0EDE8 0%, #E8E4DF 40%, #EDE9E3 100%);
        }
        [data-theme="light"] .ai-silk-w1,
        [data-theme="light"] .ai-silk-w2,
        [data-theme="light"] .ai-silk-w3,
        [data-theme="light"] .ai-silk-w4 {
          background-image: none;
        }
        [data-theme="light"] .ai-silk-sheen {
          background-image: linear-gradient(108deg, transparent 25%, rgba(212,168,83,0.04) 38%, rgba(212,168,83,0.08) 50%, rgba(212,168,83,0.04) 62%, transparent 75%);
        }
        [data-theme="light"] .ai-card-idle {
          background-image: none;
          background: rgba(255,255,255,0.75);
          border-color: rgba(120,120,130,0.2);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
        }
      `}</style>

      {/* SVG filters */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="ai-silk-warp" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="4" seed="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="120" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="ai-silk-warp-2" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.014" numOctaves="3" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="90" xChannelSelector="G" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>

      {/* Silk background */}
      <div className="absolute inset-0 ai-silk-base" />
      <div className="absolute -inset-[20%] pointer-events-none ai-silk-w1" style={{ filter: "url(#ai-silk-warp)" }} />
      <div className="absolute -inset-[20%] pointer-events-none ai-silk-w2" style={{ filter: "url(#ai-silk-warp-2)" }} />
      <div className="absolute -inset-[20%] pointer-events-none ai-silk-w3" style={{ filter: "url(#ai-silk-warp)" }} />
      <div className="absolute -inset-[20%] pointer-events-none ai-silk-w4" style={{ filter: "url(#ai-silk-warp-2)" }} />
      <div className="absolute -inset-[20%] pointer-events-none ai-silk-sheen" style={{ filter: "url(#ai-silk-warp)" }} />

      <div className={`flex-1 min-h-0 flex flex-col items-center px-6 relative z-10 overflow-hidden py-4 ${
        !activePost && !lastAssistant && !loading ? "justify-center" : ""
      }`}>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/15 px-6 py-5 max-w-sm mb-4 text-center">
            <p className="text-sm text-red-400/80">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-400/40 mt-3 hover:text-red-400 transition-colors">Dismiss</button>
          </div>
        )}

        {/* Loading state (no mockup yet) */}
        {loading && !activePost && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5} className="animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm text-white/30 font-medium">Crafting your post...</p>
          </div>
        )}

        {/* Social mockup — scaled to fit viewport without scrolling */}
        {activePost && !loading ? (
          <div className={`flex-1 min-h-0 w-full flex flex-col items-center justify-center ${slideIn ? "ai-slide-in" : ""}`}>
            <div className="max-w-[320px] w-full px-4 scale-[0.85] origin-top">
              <SocialMockup
                platform={activePost.platform}
                caption={activePost.caption || undefined}
                hashtags={activePost.hashtags || undefined}
                imageUrl={activePost.imageUrl || undefined}
                username="Angie Nichols"
              />
              <div className="mt-3 px-1 flex items-center gap-4">
                {lastAssistant && (
                  <button
                    onClick={() => { setActivePost(null); }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-white/30 hover:text-accent transition-colors"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    View full response
                  </button>
                )}
                {activePost.templateId && (
                  <Link
                    href={`/dashboard/editor/${activePost.templateId}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-accent/70 hover:text-accent transition-colors"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                    Customize in Template
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : activePost && loading ? (
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
            <div className="max-w-[320px] w-full px-4 scale-[0.85] origin-top">
              <div className="opacity-50 relative">
                <SocialMockup
                  platform={activePost.platform}
                  caption={activePost.caption || undefined}
                  hashtags={activePost.hashtags || undefined}
                  imageUrl={activePost.imageUrl || undefined}
                  username="Angie Nichols"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-xl">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5} className="animate-pulse">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <p className="text-sm text-white/50 font-medium mt-2">Generating new post...</p>
                </div>
              </div>
            </div>
          </div>
        ) : !loading && !activePost && lastAssistant ? (
          <div className="mb-5 max-w-lg w-full">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-[11px] font-medium text-white/40">AI Response</span>
              </div>
              <div className="text-sm text-white/70 leading-relaxed max-h-[300px] overflow-y-auto">
                {renderMarkdown(lastAssistant.content)}
              </div>
            </div>
          </div>
        ) : !loading && !activePost ? (
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/8 mb-5">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D4A853" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-heading">AI Assistant</h1>
            <p className="text-sm text-white/25 mt-2">Describe a post and see it come to life in a platform mockup</p>
          </div>
        ) : null}

        {/* Prompt card */}
        <div ref={cardRef} className="w-full max-w-xl flex-shrink-0">
          <div className={`relative rounded-2xl ${loading ? "p-[2px]" : ""}`}>
            {/* Rainbow border when loading */}
            {loading && (
              <>
                <div className="absolute inset-0 rounded-2xl ai-gen-border z-0" />
                <div className="absolute inset-0 rounded-2xl ai-gen-border ai-gen-glow z-0" />
              </>
            )}
            <div className={`rounded-2xl border backdrop-blur-sm ai-card-idle ${loading ? "relative z-10" : ""}`}>
              {/* Textarea */}
              <div className="relative px-4 pt-3 pb-2">
                {!input && !activePost && !lastAssistant && (
                  <div
                    className="absolute inset-x-4 top-3 pointer-events-none text-[14px] leading-relaxed transition-opacity duration-[1200ms] ease-in-out"
                    style={{ opacity: suggestionFade ? 0.3 : 0 }}
                  >
                    {PROMPT_SUGGESTIONS[suggestionIdx]}
                    <span className="text-[10px] text-white/10 ml-2">Tab</span>
                  </div>
                )}
                {!input && (activePost || lastAssistant) && (
                  <div className="absolute inset-x-4 top-3 pointer-events-none text-[14px] text-white/20 leading-relaxed">
                    Ask a follow-up or describe a new post...
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !input && !activePost && !lastAssistant) { e.preventDefault(); setInput(PROMPT_SUGGESTIONS[suggestionIdx]); }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                  }}
                  rows={3}
                  className="w-full bg-transparent text-[14px] text-white focus:outline-none resize-none leading-relaxed relative z-10 transition-opacity duration-700"
                  style={{ textShadow: "0 -1px 0 rgba(0,0,0,0.3)", opacity: loading ? 0.15 : 1 }}
                />
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-white/[0.04]" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.03)" }} />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/20">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-accent/40">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Powered by Claude
                  </div>
                  <div className="w-px h-4 bg-white/[0.06] mx-0.5" />
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                    Brand Voice Active
                  </div>
                </div>

                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className={`rounded-xl px-5 py-2 text-[12px] font-semibold transition-all flex items-center gap-2 ${
                    input.trim() && !loading
                      ? "bg-accent text-black hover:bg-accent/90 active:scale-[0.97] shadow-lg shadow-accent/20"
                      : "bg-white/[0.04] text-white/15 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg width="12" height="12" className="animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                      Thinking
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Keyboard hint */}
          {input.trim() && !loading && (
            <p className="text-center text-[10px] text-white/10 mt-3">Enter to send</p>
          )}
        </div>
      </div>

      {/* History strip */}
      {history.length > 0 && (
        <div className="border-t border-white/[0.05] px-6 py-2.5 bg-white/[0.01] relative z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 shrink-0 font-medium">Recent</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {history.map((post) => (
                <button
                  key={post.timestamp}
                  onClick={() => { setActivePost(post); }}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                    activePost?.timestamp === post.timestamp
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/60 hover:border-white/[0.12]"
                  }`}
                >
                  <span className="text-[13px]">
                    {post.platform === "instagram" ? "📸" : post.platform === "facebook" ? "📘" : post.platform === "linkedin" ? "💼" : "🐦"}
                  </span>
                  {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                </button>
              ))}
            </div>
            {/* New conversation */}
            <button
              onClick={() => { setMessages([]); setActivePost(null); setError(null); setHistory([]); lastPlatformRef.current = null; }}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-white/20 hover:text-white/50 hover:border-white/[0.12] transition-all ml-auto"
            >
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={elements.length} className="bg-white/[0.04] rounded-lg p-3 my-2 overflow-x-auto text-xs">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={elements.length} className="text-sm font-bold text-white/90 mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={elements.length} className="text-base font-bold text-white/90 mt-4 mb-1.5">{renderInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={elements.length} className="text-lg font-bold text-white/90 mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
      i++; continue;
    }

    if (line.startsWith("- ")) {
      elements.push(<li key={elements.length} className="ml-4 list-disc text-white/60">{renderInline(line.slice(2))}</li>);
      i++; continue;
    }
    const olMatch = line.match(/^(\d+)\. (.+)$/);
    if (olMatch) {
      elements.push(<li key={elements.length} className="ml-4 list-decimal text-white/60">{renderInline(olMatch[2])}</li>);
      i++; continue;
    }

    if (line.trim() === "") {
      elements.push(<br key={elements.length} />);
      i++; continue;
    }

    elements.push(<p key={elements.length} className="mt-1">{renderInline(line)}</p>);
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<code key={parts.length} className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs text-accent">{match[1]}</code>);
    } else if (match[2] !== undefined) {
      parts.push(<strong key={parts.length} className="text-white/90">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={parts.length}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
