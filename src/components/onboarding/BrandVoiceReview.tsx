"use client";

import type { ZeroShotExtraction } from "@/lib/zero-shot-extraction";

// Pre-filled, editable brand voice — shown after the zero-shot history analysis.
// The user reviews/tweaks what Posterboy inferred from their past posts before
// it's used to build the Brand Book.
export default function BrandVoiceReview({
  voice,
  onChange,
  onContinue,
}: {
  voice: ZeroShotExtraction;
  onChange: (next: ZeroShotExtraction) => void;
  onContinue: () => void;
}) {
  const setList = (key: "pillars" | "weSay" | "weDontSay", i: number, val: string) => {
    const arr = [...voice[key]];
    arr[i] = val;
    onChange({ ...voice, [key]: arr });
  };

  return (
    <div className="architect-fade w-full max-w-xl">
      <h2 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-[#1c1c1e] leading-tight mb-2">
        Here&apos;s your voice
      </h2>
      <p className="text-[15px] text-[#76767e] mb-7">
        We read your past posts and drafted your brand voice. Tweak anything that doesn&apos;t sound like you.
      </p>

      <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-2">
        Tone
      </label>
      <input
        value={voice.tone}
        onChange={(e) => onChange({ ...voice, tone: e.target.value })}
        className="mb-6 w-full rounded-xl border border-black/[0.1] bg-white/85 px-4 py-3 text-[15px] text-[#1c1c1e] focus:border-[#ee2532]/60 focus:outline-none focus:ring-2 focus:ring-[#ee2532]/12"
      />

      <Section label="Content pillars" items={voice.pillars} onItem={(i, v) => setList("pillars", i, v)} compact />
      <Section label="We say" items={voice.weSay} onItem={(i, v) => setList("weSay", i, v)} />
      <Section label="We don't say" items={voice.weDontSay} onItem={(i, v) => setList("weDontSay", i, v)} />

      <div className="mt-8 flex items-center justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-[#ee2532] text-white px-11 py-3 text-sm font-semibold shadow-[0_16px_34px_-18px_rgba(238,37,50,0.7)] hover:bg-[#c81e2a] transition-all"
        >
          Looks like me
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  items,
  onItem,
  compact,
}: {
  label: string;
  items: string[];
  onItem: (i: number, v: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="mb-6">
      <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-2">
        {label}
      </label>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <input
            key={i}
            value={item}
            onChange={(e) => onItem(i, e.target.value)}
            className={`w-full rounded-xl border border-black/[0.1] bg-white/85 px-4 ${
              compact ? "py-2 text-[14px]" : "py-2.5 text-[15px]"
            } text-[#1c1c1e] focus:border-[#ee2532]/60 focus:outline-none focus:ring-2 focus:ring-[#ee2532]/12`}
          />
        ))}
      </div>
    </div>
  );
}
