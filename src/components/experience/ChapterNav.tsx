"use client";

import Link from "next/link";
import { CHAPTERS } from "@/lib/experience/chapters";

interface ChapterNavProps {
  activeIndex: number;
  dark?: boolean;
}

export default function ChapterNav({ activeIndex, dark }: ChapterNavProps) {
  return (
    <nav className={`pb-xp-chapter-nav ${dark ? "pb-xp-chapter-nav--dark" : ""}`} aria-label="Sections">
      <Link href="/" className="pb-xp-logo">posterboy</Link>
      <div className="pb-xp-chapter-steps">
        {CHAPTERS.map((c, i) => (
          <span key={c.id} className={`pb-xp-chapter-step ${i === activeIndex ? "active" : ""}`}>
            {c.label}
          </span>
        ))}
      </div>
      <Link href="/sign-in" className="pb-xp-nav-sign">Sign in</Link>
    </nav>
  );
}
