"use client";

import { useState } from "react";

const VIDEO_TYPES = [
  { label: "Listing Walkthrough", description: "Virtual tour of a property with smooth transitions", icon: "🏠" },
  { label: "Neighborhood Spotlight", description: "Highlight the best of a local area", icon: "📍" },
  { label: "Just Sold Celebration", description: "Quick congratulatory reel for closed deals", icon: "🎉" },
  { label: "Market Update", description: "Weekly or monthly stats with dynamic text", icon: "📊" },
  { label: "Agent Intro", description: "Short personal branding clip", icon: "👋" },
  { label: "Event Promo", description: "Open house or community event announcement", icon: "🗓️" },
];

const ASPECT_RATIOS = [
  { value: "9:16", label: "Reel / Story", sub: "1080×1920" },
  { value: "1:1", label: "Square", sub: "1080×1080" },
  { value: "16:9", label: "Landscape", sub: "1920×1080" },
];

export default function CreateVideoPage() {
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [ratio, setRatio] = useState(0);
  const [prompt, setPrompt] = useState("");

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-text mb-1">Create Video</h1>
        <p className="text-sm text-text-secondary/60 mb-8">Generate social media videos for your real estate brand</p>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-text-secondary/40 mb-3">Video Type</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {VIDEO_TYPES.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setSelectedType(i)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedType === i
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <span className="text-xl mb-2 block">{t.icon}</span>
                <span className="text-sm font-medium text-text block">{t.label}</span>
                <span className="text-xs text-text-secondary/50 block mt-0.5">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-text-secondary/40 mb-3">Aspect Ratio</p>
          <div className="flex gap-3">
            {ASPECT_RATIOS.map((r, i) => (
              <button
                key={r.value}
                onClick={() => setRatio(i)}
                className={`px-5 py-3 rounded-xl border transition-all cursor-pointer ${
                  ratio === i
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <span className="text-sm font-medium text-text block">{r.label}</span>
                <span className="text-[10px] text-text-secondary/40">{r.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-text-secondary/40 mb-3">Describe Your Video</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A walkthrough of a modern 3-bed home in Kirkwood with warm lighting and soft music..."
            className="w-full h-32 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-text text-sm p-4 resize-none outline-none focus:border-blue-500/40 transition-colors placeholder:text-text-secondary/30"
          />
        </div>

        <button
          disabled={selectedType === null || !prompt.trim()}
          className="px-8 py-3 rounded-xl bg-blue-500 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Generate Video
        </button>

        <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-text-secondary/40 text-sm">Video generation coming soon</p>
          <p className="text-text-secondary/25 text-xs mt-1">AI-powered video creation for real estate social media</p>
        </div>
      </div>
    </div>
  );
}
