import Link from "next/link";

export default function BentoBrandTiles() {
  return (
    <div className="dbento-bot-stack">
      <Link href="/dashboard/brand-intake" className="dbento-card dbento-brand-tile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80"
          alt=""
        />
        <div className="dbento-brand-tag">
          <small>Built with</small>
          <span>Your voice</span>
        </div>
      </Link>

      <Link href="/dashboard/settings" className="dbento-card dbento-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80"
          alt=""
        />
        <div className="dbento-mark-overlay" aria-hidden="true" />
        <div className="dbento-mark-wm">
          <span className="dbento-mark-glyph">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/posterboy-app-icon.png" alt="" />
          </span>
          posterboy
        </div>
      </Link>
    </div>
  );
}
