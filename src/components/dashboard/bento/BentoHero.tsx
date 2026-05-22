"use client";

import Link from "next/link";
import { CORE } from "@/lib/posterboy-copy";

interface BentoHeroProps {
  pendingCount: number;
  nextLabel?: string;
}

export default function BentoHero({ pendingCount, nextLabel }: BentoHeroProps) {
  const headline =
    pendingCount === 0
      ? "Nothing waiting."
      : pendingCount === 1
        ? "One draft ready."
        : `${pendingCount} drafts ready.`;

  return (
    <section className="dbento-card dbento-hero">
      <div className="dbento-hero-screen" aria-hidden="true" />
      <Link href="/dashboard/drafts" className="dbento-hero-link" aria-label="Go to drafts" />
      <div className="dbento-hero-copy">
        <h2>
          {headline}
          <br />
          <span>{CORE.approveLeisure}</span>
        </h2>
        <p>
          {nextLabel
            ? `Next up: ${nextLabel}.`
            : CORE.weekDrafted}
        </p>
      </div>
    </section>
  );
}
