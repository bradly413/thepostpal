"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import { generateBrandBook } from "@/lib/onboarding-agent";
import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import "@/styles/onboarding.css";

type Phase = "wizard" | "building" | "review";

const BUILD_STEPS = [
  "Analyzing your brand personality…",
  "Selecting your color palette…",
  "Pairing typography…",
  "Crafting your voice guidelines…",
  "Generating post templates…",
  "Building your brand book…",
  "Finalizing…",
];

const CONTENT_FOCUS_OPTIONS = [
  { id: "listings", label: "Listings", icon: "🏠" },
  { id: "market-updates", label: "Market Updates", icon: "📊" },
  { id: "sold", label: "Sold Announcements", icon: "🎉" },
  { id: "neighborhood", label: "Neighborhood Spotlights", icon: "🏘️" },
  { id: "tips", label: "Buyer/Seller Tips", icon: "💡" },
  { id: "open-house", label: "Open Houses", icon: "🚪" },
  { id: "testimonials", label: "Client Testimonials", icon: "⭐" },
  { id: "community", label: "Community Events", icon: "🤝" },
];

const PLATFORM_OPTIONS = [
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "facebook", label: "Facebook", icon: "👥" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "youtube", label: "YouTube", icon: "▶️" },
  { id: "twitter", label: "X / Twitter", icon: "✕" },
];

const PERSONALITY_DIMENSIONS = [
  {
    dimension: "Sincerity",
    description: "Down-to-earth, honest, and wholesome",
    traits: [
      { id: "warm", label: "Warm & Approachable" },
      { id: "honest", label: "Honest & Transparent" },
      { id: "community", label: "Community Connector" },
      { id: "wholesome", label: "Wholesome & Genuine" },
    ],
  },
  {
    dimension: "Excitement",
    description: "Bold, spirited, and imaginative",
    traits: [
      { id: "energetic", label: "Energetic & Bold" },
      { id: "storyteller", label: "Storyteller" },
      { id: "creative", label: "Creative & Imaginative" },
      { id: "trendy", label: "Trendy & Current" },
    ],
  },
  {
    dimension: "Competence",
    description: "Reliable, intelligent, and dependable",
    traits: [
      { id: "professional", label: "Professional & Polished" },
      { id: "data-driven", label: "Data-Driven & Analytical" },
      { id: "educational", label: "Educational & Helpful" },
      { id: "dependable", label: "Dependable & Steady" },
    ],
  },
  {
    dimension: "Sophistication",
    description: "Elegant, prestigious, and refined",
    traits: [
      { id: "luxury", label: "Luxury & Sophisticated" },
      { id: "elegant", label: "Elegant & Refined" },
      { id: "exclusive", label: "Exclusive & Premium" },
      { id: "charming", label: "Charming & Graceful" },
    ],
  },
  {
    dimension: "Ruggedness",
    description: "Tough, outdoorsy, and no-nonsense",
    traits: [
      { id: "tough", label: "Tough & Direct" },
      { id: "adventurous", label: "Adventurous & Daring" },
      { id: "no-nonsense", label: "No-Nonsense & Practical" },
      { id: "resilient", label: "Resilient & Gritty" },
    ],
  },
];

const PERSONALITY_OPTIONS = PERSONALITY_DIMENSIONS.flatMap((d) => d.traits);

const TARGET_OPTIONS = [
  { id: "first-time", label: "First-Time Buyers" },
  { id: "luxury", label: "Luxury" },
  { id: "investors", label: "Investors" },
  { id: "downsizers", label: "Downsizers" },
  { id: "relocation", label: "Relocation" },
  { id: "families", label: "Families" },
  { id: "new-construction", label: "New Construction" },
  { id: "commercial", label: "Commercial" },
];

const BRAND_COLORS = [
  { hex: "#1B2A4A", name: "Navy" },
  { hex: "#2C3E50", name: "Midnight" },
  { hex: "#34495E", name: "Slate" },
  { hex: "#1A3C34", name: "Forest" },
  { hex: "#2D5016", name: "Evergreen" },
  { hex: "#4A6741", name: "Sage" },
  { hex: "#6B705C", name: "Olive" },
  { hex: "#8B5E3C", name: "Saddle" },
  { hex: "#A0522D", name: "Sienna" },
  { hex: "#B8860B", name: "Gold" },
  { hex: "#D4A853", name: "Honey" },
  { hex: "#C9B99A", name: "Sand" },
  { hex: "#722F37", name: "Wine" },
  { hex: "#8B0000", name: "Crimson" },
  { hex: "#B76E79", name: "Rose" },
  { hex: "#D4A5A5", name: "Blush" },
  { hex: "#4A90D9", name: "Azure" },
  { hex: "#5B9BD5", name: "Sky" },
  { hex: "#708090", name: "Storm" },
  { hex: "#2F4F4F", name: "Teal" },
  { hex: "#3B3B3B", name: "Charcoal" },
  { hex: "#1A1A2E", name: "Ink" },
  { hex: "#E8D5B7", name: "Linen" },
  { hex: "#F5F0E8", name: "Ivory" },
];

const VIBRANT_COLORS = [
  { hex: "#E63946", name: "Poppy" },
  { hex: "#FF6B6B", name: "Coral" },
  { hex: "#FF8C42", name: "Tangerine" },
  { hex: "#F4A261", name: "Apricot" },
  { hex: "#FFD166", name: "Marigold" },
  { hex: "#FFEB3B", name: "Lemon" },
  { hex: "#06D6A0", name: "Mint" },
  { hex: "#2EC4B6", name: "Turquoise" },
  { hex: "#00B4D8", name: "Cyan" },
  { hex: "#0077B6", name: "Ocean" },
  { hex: "#3A86FF", name: "Electric" },
  { hex: "#6366F1", name: "Indigo" },
  { hex: "#8338EC", name: "Violet" },
  { hex: "#A855F7", name: "Amethyst" },
  { hex: "#D946EF", name: "Fuchsia" },
  { hex: "#EC4899", name: "Hot Pink" },
  { hex: "#F472B6", name: "Peony" },
  { hex: "#FB923C", name: "Ember" },
  { hex: "#84CC16", name: "Lime" },
  { hex: "#22C55E", name: "Emerald" },
  { hex: "#14B8A6", name: "Jade" },
  { hex: "#06B6D4", name: "Lagoon" },
  { hex: "#EF4444", name: "Scarlet" },
  { hex: "#F59E0B", name: "Amber" },
];

const ALL_COLORS = [...BRAND_COLORS, ...VIBRANT_COLORS];

const FONT_PAIRINGS = [
  {
    id: "rufina-roboto",
    title: "Rufina",
    body: "Roboto",
    titleCategory: "serif" as const,
    bodyCategory: "sans-serif" as const,
    vibe: "Classic editorial",
  },
  {
    id: "playfair-opensans",
    title: "Playfair Display",
    body: "Open Sans",
    titleCategory: "serif" as const,
    bodyCategory: "sans-serif" as const,
    vibe: "Luxury meets readability",
  },
  {
    id: "cormorant-lato",
    title: "Cormorant Garamond",
    body: "Lato",
    titleCategory: "serif" as const,
    bodyCategory: "sans-serif" as const,
    vibe: "Elegant & refined",
  },
  {
    id: "worksans-sourceserif",
    title: "Work Sans",
    body: "Source Serif Pro",
    titleCategory: "sans-serif" as const,
    bodyCategory: "serif" as const,
    vibe: "Modern & warm",
  },
  {
    id: "poppins-lora",
    title: "Poppins",
    body: "Lora",
    titleCategory: "sans-serif" as const,
    bodyCategory: "serif" as const,
    vibe: "Friendly & inviting",
  },
];

const FONT_FAMILIES_URL = "https://fonts.googleapis.com/css2?family=Rufina:wght@400;700&family=Roboto:wght@300;400;500&family=Playfair+Display:wght@400;700&family=Open+Sans:wght@300;400;600&family=Cormorant+Garamond:wght@300;400;600&family=Lato:wght@300;400;700&family=Work+Sans:wght@300;400;600&family=Source+Serif+Pro:wght@300;400;600&family=Poppins:wght@300;400;600&family=Lora:wght@400;500;700&display=swap";

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100, l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function generatePalette(hex: string): string[] {
  const [h, s, l] = hexToHsl(hex);
  return [
    hslToHex(h, Math.min(s + 10, 100), Math.min(l + 30, 88)),
    hslToHex(h, s, Math.min(l + 15, 78)),
    hslToHex(h, Math.max(s - 5, 0), Math.max(l - 15, 25)),
    hslToHex(h, Math.max(s - 15, 0), Math.max(l - 30, 15)),
    hslToHex(0, 0, 5),
  ];
}

function GeneratedPalette({ primaryHex }: { primaryHex: string }) {
  const palette = generatePalette(primaryHex);
  const primaryName = ALL_COLORS.find((c) => c.hex === primaryHex)?.name || "Primary";
  const allSwatches = [primaryHex, ...palette];
  const labels = [primaryName, "Light", "Mid", "Dark", "Deep", "Ink"];

  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 160;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-[11px] font-medium uppercase tracking-widest text-text-secondary/60 mb-2 pl-1">Your palette</p>
      <div className="grid grid-cols-6 gap-1.5">
        {allSwatches.map((hex, i) => (
          <div key={hex + i} className="flex flex-col items-center gap-1">
            <div
              className="w-full aspect-square rounded-xl border border-white/[0.06] transition-transform duration-200 hover:scale-105"
              style={{ background: hex }}
            />
            <span className="text-[9px] font-mono text-text-secondary">{hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorSwatchPicker({
  colors,
  selected,
  onSelect,
  delayOffset = 0,
}: {
  colors: { hex: string; name: string }[];
  selected: string | null;
  onSelect: (hex: string) => void;
  delayOffset?: number;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const list = listRef.current;
    if (!list) return;
    const x = e.clientX;
    const threshold = 140;

    for (let i = 0; i < list.children.length; i++) {
      const child = list.children[i] as HTMLElement;
      const { left, width } = child.getBoundingClientRect();
      const center = left + width * 0.5;
      const dist = x - center;
      const clamped = Math.max(-threshold, Math.min(threshold, dist));
      const mapped = clamped / threshold;
      const power = mapped > 0
        ? 1 - Math.pow(mapped, 2)
        : 1 - Math.pow(Math.abs(mapped), 1.5);
      child.style.setProperty("--power", String(Math.max(0, power)));
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    for (let i = 0; i < list.children.length; i++) {
      (list.children[i] as HTMLElement).style.setProperty("--power", "0");
    }
  }, []);

  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 160;
  };

  return (
    <ul
      ref={listRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative mx-auto my-0 p-0 list-none select-none"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${colors.length + 3}, 1fr)`,
        touchAction: "none",
        transform: "translateY(60%)",
        clipPath: "inset(-100% -100% 0 -100%)",
      }}
    >
      {colors.map((c, i) => (
        <li
          key={c.hex}
          className="relative"
          style={{
            aspectRatio: "1 / 4",
            "--i": i,
            "--power": 0,
            animation: `swatchEnter 0.25s ${delayOffset + Math.round(Math.sin((i / colors.length) * Math.PI * 0.5) * 800)}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
          } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => onSelect(c.hex)}
            aria-label={`${c.name} (${c.hex})`}
            className="absolute border-0 p-3 grid place-items-start cursor-pointer transition-[translate,rotate] duration-150"
            style={{
              background: c.hex,
              borderRadius: "1rem",
              width: "400%",
              aspectRatio: "3 / 4",
              color: isLight(c.hex) ? "#000" : "#fff",
              fontFamily: "'Reddit Mono', 'SF Mono', monospace",
              fontWeight: 600,
              rotate: `calc(var(--power, 0) * -4deg)`,
              translate: `0 calc(clamp(0, var(--power), 1) * -42%)`,
              outline: selected === c.hex ? "3px solid #D4A853" : "none",
              outlineOffset: selected === c.hex ? "3px" : "0",
              boxShadow: selected === c.hex ? "0 0 0 6px rgba(212,168,83,0.2)" : "none",
            }}
          >
            <span
              className="text-[10px] opacity-0 translate-y-1/2 transition-all duration-200 pointer-events-none"
              style={{
                fontSize: "min(10cqi, 11px)",
                opacity: "var(--power, 0)",
                translate: `0 calc((1 - var(--power, 0)) * 50%)`,
              }}
            >
              {c.name}
              <br />
              {c.hex}
            </span>
          </button>
        </li>
      ))}
      <style>{`
        @keyframes swatchEnter {
          from { translate: 0 100%; }
          to { translate: 0 0; }
        }
      `}</style>
    </ul>
  );
}

function FontPairingCards({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = el.querySelectorAll<HTMLElement>("[data-font-card]");
    if (prefersReducedMotion) {
      gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
    } else {
      gsap.set(cards, { opacity: 0, y: 24, scale: 0.97 });
      gsap.to(cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
        delay: 0.1,
      });
    }
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-2.5">
      {FONT_PAIRINGS.map((fp) => {
        const isSelected = selected === fp.id;
        return (
          <button
            key={fp.id}
            data-font-card
            type="button"
            onClick={() => onSelect(fp.id)}
            className={`w-full text-left rounded-xl px-5 py-4 transition-all duration-200 bg-surface ${
              isSelected
                ? "border-2 border-text shadow-sm"
                : "border border-border hover:border-text/40"
            }`}
            style={{ opacity: 0 }}
          >
            <div className="flex items-baseline gap-4">
              <p
                className="leading-[1.1] shrink-0 text-text"
                style={{
                  fontFamily: `'${fp.title}', ${fp.titleCategory}`,
                  fontWeight: 700,
                  fontSize: "22px",
                }}
              >
                {fp.title}
              </p>
              <p
                className="uppercase tracking-[0.2em] text-text-secondary"
                style={{
                  fontFamily: `'${fp.body}', ${fp.bodyCategory}`,
                  fontSize: "9px",
                  fontWeight: 500,
                }}
              >
                {fp.body}
              </p>
            </div>
            <p
              className="leading-snug mt-1 text-text-secondary"
              style={{
                fontFamily: `'${fp.body}', ${fp.bodyCategory}`,
                fontWeight: 400,
                fontSize: "12px",
              }}
            >
              Every property tells a story. We help you find the one that becomes yours.
            </p>
          </button>
        );
      })}
    </div>
  );
}

const TOTAL_STEPS = 7;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-500"
          style={{
            width: i === current ? 32 : i < current ? 20 : 12,
            background:
              i <= current ? "var(--color-accent, #ee2532)" : "var(--color-border)",
            opacity: i <= current ? 1 : 0.7,
          }}
        />
      ))}
    </div>
  );
}

const CHAT_MESSAGES: Record<number, { role: "assistant"; text: string }[]> = {
  0: [
    { role: "assistant", text: "Hey — welcome to posterboy." },
    { role: "assistant", text: "Let's start with the basics — your name, brokerage, and where you work. This helps us tailor your brand book to your market." },
    { role: "assistant", text: "Don't worry about getting it perfect — you can always update these later." },
  ],
  1: [
    { role: "assistant", text: "Now let's talk about your ideal clients." },
    { role: "assistant", text: "Who do you love working with most? First-time buyers who need hand-holding? Luxury clients who expect white-glove service? Investors who want data?" },
    { role: "assistant", text: "Pick as many as you want — this shapes the tone of your brand." },
  ],
  2: [
    { role: "assistant", text: "What kind of content gets you excited?" },
    { role: "assistant", text: "Think about what you'd actually want to post every week. Listings and sold announcements? Market updates that show you know your stuff? Tips that help your audience?" },
    { role: "assistant", text: "I'll build your content calendar around these pillars." },
  ],
  3: [
    { role: "assistant", text: "Where does your audience hang out?" },
    { role: "assistant", text: "Instagram is great for visual storytelling. Facebook for community. LinkedIn for credibility. TikTok if you want to reach younger buyers." },
    { role: "assistant", text: "I'll optimize your templates for each platform you pick." },
  ],
  4: [
    { role: "assistant", text: "Now for the fun part — let's pick your primary color. 🎨" },
    { role: "assistant", text: "Hover over the swatches to explore. Navy and forest tones say trust and stability. Gold and warm tones say luxury. Sage and blush feel modern and approachable." },
    { role: "assistant", text: "This becomes the anchor of your entire palette — I'll build complementary colors around whatever you choose." },
  ],
  5: [
    { role: "assistant", text: "Time to choose your fonts — this shapes how people feel before they read a word. ✍️" },
    { role: "assistant", text: "Great typography pairs contrast with harmony: a distinctive display font for headlines with a clean body font for readability. Serif + sans-serif is the classic power move." },
    { role: "assistant", text: "For real estate, your title font is your first impression — it appears on every listing, every ad, every social post. The body font handles the details, so it needs to be effortlessly readable at any size." },
    { role: "assistant", text: "Pick the pairing that feels most like your brand. Trust your gut — if it looks like you, it probably is." },
  ],
  6: [
    { role: "assistant", text: "This is the heart of your brand — your personality. 💛" },
    { role: "assistant", text: "Based on brand psychology, there are 5 personality dimensions: Sincerity, Excitement, Competence, Sophistication, and Ruggedness. Pick 3–5 traits that feel most like you — you can mix across dimensions." },
    { role: "assistant", text: "Think of these traits as filters for everything you do — your posts, your replies, even your policies. The more consistent you are, the more people will trust you because they know what to expect." },
    { role: "assistant", text: "Don't try to appeal to everyone. Those little quirks that make you different? That's exactly what makes your brand memorable." },
  ],
};

function OnboardingChat({ step, formData }: { step: number; formData: FormData }) {
  const [inputValue, setInputValue] = useState("");
  const [userMessages, setUserMessages] = useState<Record<number, string[]>>({});
  const [aiReplies, setAiReplies] = useState<Record<number, string[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(step);

  useEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
    }
  }, [step]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step, userMessages, aiReplies]);

  const handleSend = () => {
    const msg = inputValue.trim();
    if (!msg) return;
    setInputValue("");
    setUserMessages((prev) => ({
      ...prev,
      [step]: [...(prev[step] || []), msg],
    }));
    setTimeout(() => {
      const replies = [
        "Great input! That helps me understand your brand better.",
        "Love it — I'll factor that into your brand book.",
        "Noted! Keep going with the selections on the left.",
        "Perfect, that gives me a clearer picture of your style.",
        "Thanks! Every detail helps build a more authentic brand.",
      ];
      setAiReplies((prev) => ({
        ...prev,
        [step]: [...(prev[step] || []), replies[Math.floor(Math.random() * replies.length)]],
      }));
    }, 800);
  };

  const baseMessages = CHAT_MESSAGES[step] || [];
  const stepUserMsgs = userMessages[step] || [];
  const stepAiReplies = aiReplies[step] || [];

  const allMessages: { role: "assistant" | "user"; text: string }[] = [];
  baseMessages.forEach((m) => allMessages.push(m));
  for (let i = 0; i < Math.max(stepUserMsgs.length, stepAiReplies.length); i++) {
    if (stepUserMsgs[i]) allMessages.push({ role: "user", text: stepUserMsgs[i] });
    if (stepAiReplies[i]) allMessages.push({ role: "assistant", text: stepAiReplies[i] });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="shrink-0 px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
            <path d="M10 21h4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-text">Brand Assistant</p>
          <p className="text-[11px] text-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ scrollbarWidth: "thin" }}>
        {allMessages.map((msg, i) => (
          <div
            key={`${step}-${i}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "fadeSlideIn 0.3s ease forwards", animationDelay: `${msg.role === "assistant" && i < baseMessages.length ? i * 0.15 : 0}s`, opacity: 0 }}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/15 text-text rounded-br-md"
                  : "bg-surface border border-border text-text/80 rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2 focus-within:border-accent/40 transition-colors">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Ask me anything about branding..."
            aria-label="Chat with brand assistant"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-secondary/50 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-1.5 rounded-lg hover:bg-accent/10 text-accent disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-text-secondary/40 text-center mt-2">
          Your AI brand assistant — here to help
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function PillSelector({
  options,
  selected,
  onToggle,
  showIcons = true,
}: {
  options: { id: string; label: string; icon?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  showIcons?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
              border transition-all duration-200
              ${
                isSelected
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-elevated border-border text-text-secondary hover:border-accent/20 hover:text-text"
              }
            `}
          >
            {showIcons && opt.icon && <span className="text-base">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function WizardStep({
  step,
  formData,
  setFormData,
  onBack,
  onContinue,
  canContinue,
}: {
  step: number;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const toggle = (field: keyof FormData, id: string) => {
    setFormData((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      };
    });
  };

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-2">
                Let&apos;s build your brand
              </h1>
              <p className="text-text-secondary text-sm">
                Tell us about yourself so posterboy can create social media posts you actually use.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 rounded-xl bg-elevated border border-border text-sm text-text placeholder:text-text-secondary/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.brokerage}
                  onChange={(e) => setFormData((p) => ({ ...p, brokerage: e.target.value }))}
                  placeholder="Compass, RE/MAX, Keller Williams..."
                  className="w-full px-4 py-3 rounded-xl bg-elevated border border-border text-sm text-text placeholder:text-text-secondary/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Denver Metro, Austin TX, Bay Area..."
                  className="w-full px-4 py-3 rounded-xl bg-elevated border border-border text-sm text-text placeholder:text-text-secondary/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-2">
                Who&apos;s your ideal client?
              </h1>
              <p className="text-text-secondary text-sm">
                Select all that apply. We&apos;ll tailor your content to resonate with them.
              </p>
            </div>
            <PillSelector
              options={TARGET_OPTIONS}
              selected={formData.targetClient}
              onToggle={(id) => toggle("targetClient", id)}
              showIcons={false}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-2">
                What content do you want to post?
              </h1>
              <p className="text-text-secondary text-sm">
                Pick the types of content that matter most to your business.
              </p>
            </div>
            <PillSelector
              options={CONTENT_FOCUS_OPTIONS}
              selected={formData.contentFocus}
              onToggle={(id) => toggle("contentFocus", id)}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-2">
                Where will you be posting?
              </h1>
              <p className="text-text-secondary text-sm">
                Select your active platforms so we can optimize your templates.
              </p>
            </div>
            <PillSelector
              options={PLATFORM_OPTIONS}
              selected={formData.platforms}
              onToggle={(id) => toggle("platforms", id)}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-1">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-1">
                Pick your primary color
              </h1>
              <p className="text-text-secondary text-sm">
                This anchors your entire brand palette. Hover to explore, click to select.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-text-secondary/60 mb-0.5 pl-1">Classic</p>
              <div className="relative overflow-hidden rounded-2xl bg-bg" style={{ minHeight: 160 }}>
                <ColorSwatchPicker
                  colors={BRAND_COLORS}
                  selected={formData.primaryColor || null}
                  onSelect={(hex) => setFormData((p) => ({ ...p, primaryColor: hex }))}
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-text-secondary/60 mb-0.5 pl-1">Vibrant</p>
              <div className="relative overflow-hidden rounded-2xl bg-bg" style={{ minHeight: 160 }}>
                <ColorSwatchPicker
                  colors={VIBRANT_COLORS}
                  selected={formData.primaryColor || null}
                  onSelect={(hex) => setFormData((p) => ({ ...p, primaryColor: hex }))}
                  delayOffset={300}
                />
              </div>
            </div>
            {formData.primaryColor && (
              <GeneratedPalette primaryHex={formData.primaryColor} />
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <link rel="stylesheet" href={FONT_FAMILIES_URL} />
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-1">
                Choose your fonts
              </h1>
              <p className="text-text-secondary text-sm">
                Pick a pairing that feels like your brand. The title font sets the mood, the body font handles the details.
              </p>
            </div>
            <FontPairingCards
              selected={formData.fontPairing}
              onSelect={(id) => setFormData((p) => ({ ...p, fontPairing: id }))}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-heading font-bold text-text mb-1">
                What&apos;s your brand personality?
              </h1>
              <p className="text-text-secondary text-sm">
                Pick 3–5 traits that feel most like you. Mix across dimensions — your unique blend is what sets you apart.
              </p>
            </div>
            <div className="space-y-3">
              {PERSONALITY_DIMENSIONS.map((dim) => (
                <div key={dim.dimension}>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <p className="text-xs font-semibold text-text">{dim.dimension}</p>
                    <p className="text-[11px] text-text-secondary/60">{dim.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dim.traits.map((opt) => {
                      const isSelected = formData.personality.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggle("personality", opt.id)}
                          className={`
                            inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                            border transition-all duration-200
                            ${isSelected
                              ? "bg-accent/15 border-accent/40 text-accent"
                              : "bg-elevated border-border text-text-secondary hover:border-accent/20 hover:text-text"
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {formData.personality.length > 0 && (
              <p className="text-[11px] text-text-secondary/50">
                {formData.personality.length} trait{formData.personality.length !== 1 ? "s" : ""} selected
                {formData.personality.length < 3 ? " — pick at least 3 for best results" : ""}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <OnboardingHeader />

      {/* Content — centered single column */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
        <div className="w-full max-w-[460px]">
          {/* Progress */}
          <div className="mb-7 flex items-center justify-center">
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {stepContent()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
            {step > 0 ? (
              <button
                onClick={onBack}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text transition-colors"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onContinue}
              disabled={!canContinue}
              className="px-6 py-3 rounded-full pb-onboarding-cta text-sm font-semibold transition-all disabled:pointer-events-none shadow-sm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuildingScreen({ onDone }: { onDone: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const stepDuration = 800;

    const interval = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= BUILD_STEPS.length - 1) {
          clearInterval(interval);
          timeout = setTimeout(() => {
            if (!cancelled) onDoneRef.current();
          }, 600);
          return s;
        }
        return s + 1;
      });
    }, stepDuration);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    setProgress(((currentStep + 1) / BUILD_STEPS.length) * 100);
  }, [currentStep]);

  return (
    <div className="flex flex-col h-dvh bg-bg overflow-hidden">
      <OnboardingHeader showSignIn={false} />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="relative mx-auto w-20 h-20 mb-8">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-border)" strokeWidth="3" />
              <circle
                cx="40" cy="40" r="36" fill="none" stroke="var(--color-accent, #ee2532)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-semibold text-text tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="h-12 flex items-center justify-center relative">
            {BUILD_STEPS.map((step, i) => (
              <p
                key={step}
                className="absolute text-sm text-text-secondary transition-all duration-500"
                style={{
                  opacity: i === currentStep ? 1 : 0,
                  transform: i === currentStep ? "translateY(0)" : i < currentStep ? "translateY(-8px)" : "translateY(8px)",
                }}
              >
                {step}
              </p>
            ))}
          </div>

          <div className="flex justify-center gap-1 mt-6">
            {BUILD_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === currentStep ? 20 : 6,
                  background: i <= currentStep ? "var(--color-accent, #ee2532)" : "var(--color-border)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandReviewScreen({
  brandBook,
  onApprove,
  onRegenerate,
  saving,
}: {
  brandBook: BrandBook;
  onApprove: () => void;
  onRegenerate: () => void;
  saving: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const { identity, palette, typography, voice, pillars } = brandBook;

  const sections = [
    {
      title: "Color Palette",
      content: (
        <div className="flex gap-2">
          {[
            { name: palette.ink.name, hex: palette.ink.hex },
            { name: palette.bone.name, hex: palette.bone.hex },
            { name: palette.signal.name, hex: palette.signal.hex },
          ].map((c) => (
            <div key={c.hex} className="flex-1 text-center">
              <div className="w-full aspect-square rounded-xl border border-border mb-1.5" style={{ background: c.hex }} />
              <p className="text-[10px] text-text-secondary">{c.name}</p>
              <p className="text-[9px] text-text-secondary/50 uppercase">{c.hex}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Typography",
      content: (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-text-secondary/50 mb-0.5">Display</p>
            <p className="text-xl text-text" style={{ fontFamily: `'${typography.display.family}', serif` }}>
              {typography.display.family}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary/50 mb-0.5">Body</p>
            <p className="text-sm text-text" style={{ fontFamily: `'${typography.body.family}', sans-serif` }}>
              {typography.body.family}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Voice",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text/80 leading-relaxed italic">
            &ldquo;{voice.hero}&rdquo;
          </p>
          <div className="flex gap-4 text-[10px]">
            <div>
              <p className="text-success/80 font-medium mb-1">ALWAYS</p>
              <p className="text-text-secondary">{voice.always}</p>
            </div>
            <div>
              <p className="text-danger/80 font-medium mb-1">NEVER</p>
              <p className="text-text-secondary">{voice.never}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Content Pillars",
      content: (
        <div className="flex flex-wrap gap-1.5">
          {pillars.map((p) => (
            <span key={p.name} className="px-2.5 py-1 rounded-full bg-elevated border border-border text-[11px] text-text-secondary">
              {p.name}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-dvh bg-bg overflow-hidden">
      <OnboardingHeader subtitle="Brand book preview" showSignIn={false} />

      <div className={`flex-1 overflow-y-auto px-4 py-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase pb-onboarding-kicker font-semibold mb-2">
              YOUR BRAND BOOK
            </p>
            <h2 className="text-2xl font-heading font-semibold text-text mb-1">{identity.name}</h2>
            <p className="text-sm text-text-secondary">
              {identity.title}
              {identity.brokerage ? ` · ${identity.brokerage}` : ""}
              {identity.location ? ` · ${identity.location}` : ""}
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section, i) => (
              <div
                key={section.title}
                className="rounded-2xl bg-elevated border border-border p-5 transition-all duration-500"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(12px)",
                  transitionDelay: `${150 + i * 100}ms`,
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary/50 mb-3">{section.title}</p>
                {section.content}
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 mt-8 pb-4">
            <button
              onClick={onApprove}
              disabled={saving}
              className="w-full max-w-xs px-6 py-3.5 rounded-full pb-onboarding-cta font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none shadow-sm"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" className="animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Saving…
                </span>
              ) : (
                "Looks great — let's go"
              )}
            </button>
            <button
              onClick={onRegenerate}
              disabled={saving}
              className="px-4 py-2 rounded-full text-xs text-text-secondary hover:text-text transition-colors disabled:opacity-40"
            >
              Regenerate brand book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  brokerage: string;
  location: string;
  targetClient: string[];
  contentFocus: string[];
  platforms: string[];
  primaryColor: string;
  fontPairing: string;
  personality: string[];
}

function formToAnswers(form: FormData): OnboardingAnswers {
  const toneMap: Record<string, OnboardingAnswers["tonePreference"]> = {
    // Sincerity
    warm: "warm",
    honest: "warm",
    community: "warm",
    wholesome: "warm",
    // Excitement
    energetic: "playful",
    storyteller: "playful",
    creative: "playful",
    trendy: "playful",
    // Competence
    professional: "professional",
    "data-driven": "professional",
    educational: "professional",
    dependable: "professional",
    // Sophistication
    luxury: "authoritative",
    elegant: "authoritative",
    exclusive: "authoritative",
    charming: "authoritative",
    // Ruggedness
    tough: "authoritative",
    adventurous: "playful",
    "no-nonsense": "professional",
    resilient: "warm",
  };

  const primaryTrait = form.personality[0] || "warm";

  return {
    name: form.name || "Agent",
    brokerage: form.brokerage || undefined,
    location: form.location || "Local Area",
    markets: form.location ? [form.location] : ["Local"],
    targetClient: form.targetClient
      .map((id) => TARGET_OPTIONS.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(", ") || "Home buyers and sellers",
    personalityTraits: form.personality
      .map((id) => PERSONALITY_OPTIONS.find((o) => o.id === id)?.label)
      .filter((x): x is string => !!x),
    tonePreference: toneMap[primaryTrait] || "warm",
    contentFocus: form.contentFocus
      .map((id) => CONTENT_FOCUS_OPTIONS.find((o) => o.id === id)?.label)
      .filter((x): x is string => !!x),
    brandColors: form.primaryColor ? [form.primaryColor] : undefined,
    fontPairing: form.fontPairing || undefined,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("wizard");
  const [step, setStep] = useState(0);
  const [brandBook, setBrandBook] = useState<BrandBook | null>(null);
  const [saving, setSaving] = useState(false);
  const answersRef = useRef<OnboardingAnswers | null>(null);

  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    brokerage: "",
    location: "",
    targetClient: [],
    contentFocus: [],
    platforms: [],
    primaryColor: "",
    fontPairing: "",
    personality: [],
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("postpal-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(" ");
        setFormData((p) => ({
          ...p,
          ...(name ? { name } : {}),
          ...(parsed.accountName && !p.brokerage ? { brokerage: parsed.accountName } : {}),
        }));
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const canContinue = mounted && (() => {
    switch (step) {
      case 0:
        return formData.name.trim().length > 0;
      case 1:
        return formData.targetClient.length > 0;
      case 2:
        return formData.contentFocus.length > 0;
      case 3:
        return formData.platforms.length > 0;
      case 4:
        return formData.primaryColor.length > 0;
      case 5:
        return formData.fontPairing.length > 0;
      case 6:
        return formData.personality.length > 0;
      default:
        return true;
    }
  })();

  const handleContinue = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      const answers = formToAnswers(formData);
      answersRef.current = answers;
      setPhase("building");
    }
  }, [step, formData]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleBuildComplete = useCallback(() => {
    const answers = answersRef.current;
    if (!answers) return;
    const userId = `user-${Date.now()}`;
    const book = generateBrandBook(userId, answers);
    setBrandBook(book);
    setPhase("review");
  }, []);

  async function handleApprove() {
    if (!brandBook) return;
    setSaving(true);
    try {
      localStorage.setItem("postpal-brand-book", JSON.stringify(brandBook));
      const { syncBrandBookToOrganization } = await import(
        "@/lib/onboarding-brand-sync"
      );
      syncBrandBookToOrganization(brandBook);
      await new Promise((r) => setTimeout(r, 600));
      router.push("/dashboard");
    } catch {
      setSaving(false);
    }
  }

  function handleRegenerate() {
    setPhase("building");
  }

  return (
    <div data-theme="light" className="pb-onboarding min-h-dvh bg-bg text-text">
      {phase === "building" ? (
        <BuildingScreen onDone={handleBuildComplete} />
      ) : phase === "review" && brandBook ? (
        <BrandReviewScreen
          brandBook={brandBook}
          onApprove={handleApprove}
          onRegenerate={handleRegenerate}
          saving={saving}
        />
      ) : (
        <WizardStep
          step={step}
          formData={formData}
          setFormData={setFormData}
          onBack={handleBack}
          onContinue={handleContinue}
          canContinue={canContinue}
        />
      )}
    </div>
  );
}
