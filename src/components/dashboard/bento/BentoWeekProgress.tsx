import Link from "next/link";

interface BentoWeekProgressProps {
  approvedCount: number;
  totalThisWeek: number;
}

export default function BentoWeekProgress({ approvedCount, totalThisWeek }: BentoWeekProgressProps) {
  return (
    <Link href="/dashboard/dispatch" className="dbento-card dbento-week">
      <div className="dbento-week-top">
        <h4>
          <b>This week</b> at a glance
        </h4>
      </div>
      <div className="dbento-week-body">
        <h3>
          {approvedCount} of {totalThisWeek || "—"} posts
          <br />
          cleared for Dispatch.
        </h3>
      </div>
      <div className="dbento-week-strip" aria-hidden="true">
        <svg viewBox="0 0 400 80" preserveAspectRatio="none">
          <path d="M0,55 Q60,38 110,48 T220,40 T340,42 T400,38 L400,80 L0,80 Z" fill="#88a972" />
          <path
            d="M0,62 Q60,50 110,58 T220,55 T340,52 T400,50 L400,80 L0,80 Z"
            fill="#6e8f5b"
            opacity="0.7"
          />
        </svg>
      </div>
    </Link>
  );
}
