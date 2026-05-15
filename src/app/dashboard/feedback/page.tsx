"use client";

import { useState, useEffect } from "react";
import { getFeedback, removeFeedback, clearAllFeedback, type FeedbackItem } from "@/lib/feedback-store";

const TYPE_STYLES: Record<FeedbackItem["type"], { label: string; color: string; bg: string }> = {
  bug: { label: "Bug", color: "text-red-400", bg: "bg-red-500/10" },
  feature: { label: "Feature", color: "text-blue-400", bg: "bg-blue-500/10" },
  other: { label: "Other", color: "text-white/50", bg: "bg-white/5" },
};

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<"all" | FeedbackItem["type"]>("all");

  useEffect(() => {
    setItems(getFeedback());
  }, []);

  const filtered = filter === "all" ? items : items.filter((f) => f.type === filter);

  function handleRemove(id: string) {
    removeFeedback(id);
    setItems(getFeedback());
  }

  function handleClearAll() {
    if (!confirm("Delete all feedback?")) return;
    clearAllFeedback();
    setItems([]);
  }

  const counts = {
    all: items.length,
    bug: items.filter((f) => f.type === "bug").length,
    feature: items.filter((f) => f.type === "feature").length,
    other: items.filter((f) => f.type === "other").length,
  };

  return (
    <div className="px-4 py-6 md:px-6 h-full flex flex-col overflow-hidden">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Beta Feedback</h1>
          <p className="text-sm text-text-secondary mt-1">
            {items.length} item{items.length !== 1 && "s"} from beta testers
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="self-start rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 shrink-0">
        {(["all", "bug", "feature", "other"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-all ${
              filter === f
                ? "bg-white/15 text-white border border-white/20"
                : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60"
            }`}
          >
            {f === "all" ? "All" : f}{" "}
            <span className="ml-1 text-[10px] opacity-50">{counts[f]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-text-secondary/20 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <h3 className="text-base font-semibold text-text mb-1">No feedback yet</h3>
            <p className="text-sm text-text-secondary">Beta testers can submit feedback using the button in the bottom-right corner.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pb-4" style={{ scrollbarWidth: "none" }}>
          {filtered.map((item) => {
            const style = TYPE_STYLES[item.type];
            const date = new Date(item.timestamp);
            return (
              <div
                key={item.id}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.color} ${style.bg}`}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-white/25">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                    <p className="mt-2 text-[10px] text-white/20">
                      Page: {item.page}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="shrink-0 p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
