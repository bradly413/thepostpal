import Link from "next/link";
import { BENTO_CAROUSEL_FALLBACKS } from "@/lib/dashboard-modules";

interface BentoStatsProps {
  draftTotal: number;
  pendingReview: number;
}

export default function BentoStats({ draftTotal, pendingReview }: BentoStatsProps) {
  return (
    <div className="dbento-stats">
      <Link href="/dashboard/drafts" className="dbento-card dbento-stat dbento-stat-carousel">
        <div className="dbento-stat-carousel-bg" aria-hidden="true">
          {BENTO_CAROUSEL_FALLBACKS.map((bg, i) => (
            <span key={i} style={{ background: bg }} />
          ))}
        </div>
        <div className="dbento-stat-icon">
          <svg viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div className="dbento-stat-num">{draftTotal}</div>
        <div className="dbento-stat-label">
          posts
          <br />
          drafted
        </div>
      </Link>

      <Link href="/dashboard/dispatch" className="dbento-card dbento-stat">
        <div className="dbento-stat-icon">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="dbento-stat-num">
          {pendingReview}
          <em>!</em>
        </div>
        <div className="dbento-stat-label">
          awaiting
          <br />
          Press
        </div>
      </Link>
    </div>
  );
}
