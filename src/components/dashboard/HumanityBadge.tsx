"use client";

import { useMemo } from "react";
import { scoreAiNess } from "@/lib/style-critic";

// "Sounds like you" badge — runs the deterministic Style Critic in the browser
// on ANY caption (AI-generated or hand-typed) and shows how human it reads.
// Makes the moat ("measurable, not vibes") visible without a backend call.

export default function HumanityBadge({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const verdict = useMemo(() => scoreAiNess(text || ""), [text]);
  if (!text?.trim()) return null;

  const pct = Math.round(verdict.humanity * 100);
  // Three bands: clean / a little AI / reads like AI.
  const tone = verdict.aiNess < 0.2 ? "good" : verdict.aiNess < 0.5 ? "warn" : "bad";
  const label =
    tone === "good" ? `Sounds like you · ${pct}%` : tone === "warn" ? "Reads a touch AI" : "Reads like AI";
  const why =
    verdict.tells.length > 0
      ? `Tells: ${verdict.tells.map((t) => t.name).join(", ")}`
      : "No AI tells detected";

  const palette =
    tone === "good"
      ? { bg: "rgba(31,157,77,0.10)", fg: "#1f9d4d", dot: "#1f9d4d" }
      : tone === "warn"
        ? { bg: "rgba(200,140,40,0.12)", fg: "#9a6b12", dot: "#c8a000" }
        : { bg: "rgba(238,37,50,0.10)", fg: "#c41e2a", dot: "#ee2532" };

  return (
    <span
      className={className}
      title={why}
      aria-label={`${label}. ${why}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.01em",
        background: palette.bg,
        color: palette.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: 999, background: palette.dot, flex: "none" }}
      />
      {label}
    </span>
  );
}
