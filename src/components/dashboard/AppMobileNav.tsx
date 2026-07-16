"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  CalendarDays,
  FileText,
  Settings,
} from "lucide-react";

const MOBILE_NAV = [
  { label: "Home", href: "/dashboard", Icon: Home, match: "exact" as const },
  { label: "Schedule", href: "/dashboard/calendar", Icon: CalendarDays, match: "prefix" as const },
  { label: "Create", href: "/dashboard/studio", Icon: Plus, match: "prefix" as const, emphasize: true },
  { label: "Content", href: "/dashboard/drafts", Icon: FileText, match: "prefix" as const },
  { label: "Settings", href: "/dashboard/settings", Icon: Settings, match: "prefix" as const },
];

const MOBILE_NAV_CSS = `
.pb-mobile-nav {
  --ink: #1c1c1e;
  --ink-soft: #76767e;
  --red: #ee2532;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  display: none;
  padding: 0 env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(22px) saturate(1.45);
  -webkit-backdrop-filter: blur(22px) saturate(1.45);
  border-top: 1px solid rgba(20,20,30,0.08);
  box-shadow: 0 -12px 36px -24px rgba(20,20,40,0.35);
}
.pb-mobile-nav nav {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: 0;
  max-width: 560px;
  margin: 0 auto;
  padding: 6px 4px 8px;
}
.pb-mobile-nav a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 48px;
  padding: 4px 2px;
  border-radius: 14px;
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s ease, background 0.15s ease;
}
.pb-mobile-nav a svg {
  width: 22px;
  height: 22px;
  opacity: 0.9;
}
.pb-mobile-nav a:active { background: rgba(20,20,40,0.04); }
.pb-mobile-nav a.active { color: var(--red); }
.pb-mobile-nav a.active svg { opacity: 1; }
.pb-mobile-nav a.emphasize .fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-top: -14px;
  border-radius: 999px;
  background: #c81e2a;
  color: #fff;
  box-shadow: 0 10px 22px -10px rgba(200,30,42,0.65);
}
.pb-mobile-nav a.emphasize .fab svg {
  width: 22px;
  height: 22px;
  opacity: 1;
  color: #fff;
}
.pb-mobile-nav a.emphasize.active .fab {
  background: #ee2532;
}
.pb-mobile-nav a.emphasize .nav-label {
  margin-top: 2px;
}

@media (max-width: 768px) {
  .pb-mobile-nav { display: block; }
  .pb-side { display: none !important; }
}
`;

/** Phone bottom tab bar — replaces the sidebar below 768px. */
export default function AppMobileNav() {
  const pathname = usePathname();

  const isActive = (href: string, match: "exact" | "prefix") =>
    match === "exact" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="pb-mobile-nav">
      <style>{MOBILE_NAV_CSS}</style>
      <nav aria-label="Primary">
        {MOBILE_NAV.map(({ label, href, Icon, match, emphasize }) => {
          const active = isActive(href, match);
          return (
            <Link
              key={href}
              href={href}
              className={[emphasize ? "emphasize" : "", active ? "active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {emphasize ? (
                <span className="fab" aria-hidden>
                  <Icon />
                </span>
              ) : (
                <Icon aria-hidden />
              )}
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
