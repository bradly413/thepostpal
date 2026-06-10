"use client";

import { useState } from "react";
import { CalendarDays, LayoutGrid } from "lucide-react";
import PromptRewriteDemo from "@/components/onboarding/PromptRewriteDemo";

// Post-setup feature tour: split layout (copy left, live demo right), Next /
// Skip tour. The last panel kicks off brand-book generation via onFinish.

function ScheduleVisual() {
  // A tiny month grid with a few "scheduled" days marked in brand red.
  const marked = new Set([3, 7, 12, 13, 18, 24, 27]);
  return (
    <div className="prdemo" style={{ maxWidth: 320 }}>
      <div className="mb-3 flex items-center gap-2 text-[#1c1c1e]">
        <CalendarDays size={15} className="text-[#ee2532]" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9a9aa2]">This month</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <div
            key={d}
            className={`flex h-7 items-center justify-center rounded-md text-[11px] ${
              marked.has(d) ? "bg-[#ee2532] text-white font-semibold" : "bg-black/[0.04] text-black/45"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryVisual() {
  const tiles = ["/images/social-mocks/02.png", "/images/social-mocks/06.png", "/images/social-mocks/04.png", "/images/social-mocks/08.png"];
  return (
    <div className="prdemo" style={{ maxWidth: 340 }}>
      <div className="mb-3 flex items-center gap-2">
        <LayoutGrid size={15} className="text-[#ee2532]" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9a9aa2]">Your studio</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" loading="lazy" className="w-full rounded-lg" style={{ mixBlendMode: "multiply" }} />
        ))}
      </div>
    </div>
  );
}

const PANELS = [
  {
    kicker: "Watch it work",
    title: "A rough note becomes a finished post.",
    body: "Jot the gist. Posterboy writes it in your voice, on brand, and ready to go — every time.",
    visual: <PromptRewriteDemo />,
  },
  {
    kicker: "Set it and forget it",
    title: "Schedule a whole month in minutes.",
    body: "Line up your posts once and Posterboy handles the rest — the right post, the right day, automatically.",
    visual: <ScheduleVisual />,
  },
  {
    kicker: "One studio",
    title: "Every platform, always on brand.",
    body: "Photos, captions, and stories for any kind of business — all from one calm workspace.",
    visual: <GalleryVisual />,
  },
];

export default function FeatureTour({
  onFinish,
  generating,
}: {
  onFinish: () => void;
  generating: boolean;
}) {
  const [panel, setPanel] = useState(0);
  const last = panel === PANELS.length - 1;
  const p = PANELS[panel];

  return (
    <div className="architect-fade w-full max-w-4xl">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ee2532] mb-3">{p.kicker}</p>
          <h2 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-3">
            {p.title}
          </h2>
          <p className="text-[15px] text-[#76767e] leading-relaxed mb-7 max-w-md">{p.body}</p>

          <div className="flex items-center gap-2 mb-7">
            {PANELS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === panel ? "w-6 bg-[#ee2532]" : "w-1.5 bg-black/15"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              disabled={generating}
              onClick={() => (last ? onFinish() : setPanel((n) => n + 1))}
              className="rounded-full bg-[#ee2532] text-white px-9 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all disabled:opacity-50"
            >
              {generating ? "Building your brand book…" : last ? "Build my brand book" : "Next"}
            </button>
            {!last && !generating ? (
              <button
                type="button"
                onClick={onFinish}
                className="text-[13px] font-medium text-black/45 hover:text-black/75 transition-colors"
              >
                Skip tour
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center md:justify-end">{p.visual}</div>
      </div>
    </div>
  );
}
