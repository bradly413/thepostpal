"use client";

import type { ZeroShotHistoryResult } from "@/lib/zero-shot-extraction";

// Pre-filled, editable brand voice — shown after the zero-shot history analysis.
// The user reviews/tweaks what Posterboy inferred from their past posts before
// it's used to build the Brand Book.
export default function BrandVoiceReview({
  voice,
  onChange,
  onContinue,
}: {
  voice: ZeroShotHistoryResult;
  onChange: (next: ZeroShotHistoryResult) => void;
  onContinue: () => void;
}) {
  const setList = (
    key: "pillars" | "weSay" | "weDontSay" | "visualStyle",
    i: number,
    val: string,
  ) => {
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
        We read your past posts — captions, hashtags, cadence, and media mix — and drafted your brand voice. Tweak anything that doesn&apos;t sound like you.
      </p>

      {(voice.postingCadence || voice.mediaMix || voice.hashtags.length > 0) && (
        <div className="mb-7 rounded-2xl border border-black/[0.08] bg-white/70 px-4 py-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa2] mb-3">
            From your history
          </p>
          {voice.postingCadence ? (
            <p className="text-[13px] text-[#1c1c1e] mb-1.5">
              <span className="text-[#76767e]">Cadence · </span>
              {voice.postingCadence}
            </p>
          ) : null}
          {voice.mediaMix ? (
            <p className="text-[13px] text-[#1c1c1e] mb-2">
              <span className="text-[#76767e]">Media · </span>
              {voice.mediaMix}
            </p>
          ) : null}
          {voice.hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {voice.hashtags.slice(0, 10).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#1c1c1e]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[#9a9aa2]">No hashtags found in recent captions.</p>
          )}
        </div>
      )}

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
      <Section
        label="Visual style"
        items={voice.visualStyle}
        onItem={(i, v) => setList("visualStyle", i, v)}
        compact
      />

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
