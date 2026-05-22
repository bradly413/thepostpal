"use client";

import { useMemo } from "react";

export function splitToChars(text: string): string[] {
  return text.split("");
}

interface SplitHeadlineProps {
  text: string;
  className?: string;
}

export default function SplitHeadline({ text, className }: SplitHeadlineProps) {
  const chars = useMemo(() => splitToChars(text), [text]);
  return (
    <h1 className={`pb-xp-headline ${className ?? ""}`}>
      {chars.map((char, i) => (
        <span key={`${i}-${char}`} className="pb-xp-headline-char" style={{ display: char === " " ? "inline" : "inline-block" }}>
          {char === " " ? "\u00a0" : char}
        </span>
      ))}
    </h1>
  );
}
