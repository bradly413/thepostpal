"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BENTO_NAV, type BentoNavId } from "@/lib/dashboard-modules";

function NavIcon({ id }: { id: BentoNavId }) {
  const props = { viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (id) {
    case "dispatch":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "issues":
      return (
        <svg {...props}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "drafts":
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "library":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case "voice":
      return (
        <svg {...props}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
        </svg>
      );
  }
}

interface BentoMenuProps {
  businessName: string;
  locationLabel: string;
  counts: { dispatch: number; issues: number; drafts: number };
}

export default function BentoMenu({ businessName, locationLabel, counts }: BentoMenuProps) {
  const pathname = usePathname();

  return (
    <section className="dbento-card dbento-menu">
      <div className="dbento-menu-head">
        <strong>{businessName}</strong>
        <small>{locationLabel}</small>
      </div>

      <nav className="dbento-nav" aria-label="Dashboard">
        {BENTO_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const count = item.countKey ? counts[item.countKey] : null;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`dbento-nav-item${active ? " is-active" : ""}`}
            >
              <NavIcon id={item.id} />
              <span>{item.label}</span>
              {count != null && count > 0 && (
                <span className="dbento-nav-count">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <Link href="/dashboard/editor" className="dbento-new-post">
        <svg viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New post
      </Link>
    </section>
  );
}
