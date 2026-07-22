"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Plus,
  CalendarDays,
  FolderOpen,
  Settings,
  Headphones,
  Megaphone,
  Building2,
  FileText,
} from "lucide-react";
import { usePlan } from "@/components/dashboard/PlanProvider";

interface NavLink {
  label: string;
  href: string;
  Icon: typeof LayoutGrid;
  gate?: "metaAds" | "locationRollup";
  match?: "exact" | "prefix";
}

const NAV_MAIN: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", Icon: LayoutGrid, match: "exact" },
  { label: "Create", href: "/dashboard/studio", Icon: Plus, match: "prefix" },
  { label: "Schedule", href: "/dashboard/calendar", Icon: CalendarDays, match: "prefix" },
  { label: "Library", href: "/dashboard/photos", Icon: FolderOpen, match: "prefix" },
];

const NAV_OTHER: NavLink[] = [
  { label: "Content", href: "/dashboard/drafts", Icon: FileText, match: "prefix" },
  { label: "Support", href: "mailto:hello@posterboysocial.com", Icon: Headphones },
  { label: "Settings", href: "/dashboard/settings", Icon: Settings, match: "prefix" },
  { label: "Ads", href: "/dashboard/ads", Icon: Megaphone, gate: "metaAds", match: "prefix" },
  { label: "Channels", href: "/dashboard/organization", Icon: Building2, gate: "locationRollup", match: "prefix" },
];

const SIDEBAR_CSS = `
.pb-side {
  --ink: #1a1a2e;
  --ink-soft: #8b8b9a;
  --red: #ee2532;
  position: relative;
  align-self: stretch;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  padding: 26px 16px 20px;
  background: #f2f2f5;
  border-right: 1px solid rgba(26,26,46,0.06);
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
}
.pb-side .logo {
  font-family: var(--font-playfair, var(--font-instrument-serif, Georgia, serif));
  font-size: 24px;
  font-weight: 500;
  font-style: italic;
  letter-spacing: -0.03em;
  color: var(--ink);
  text-decoration: none;
  margin: 0 0 28px 8px;
  display: block;
  line-height: 1;
}
.pb-side .nav-section-label {
  margin: 0 0 8px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-soft);
}
.pb-side nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
}
.pb-side nav .grp-gap { height: 22px; }
.pb-side nav a {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: 10px;
  color: var(--ink);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition: color 0.15s ease, background 0.15s ease;
}
.pb-side nav a svg {
  width: 17px;
  height: 17px;
  color: currentColor;
  opacity: 0.75;
  flex-shrink: 0;
}
.pb-side nav a:hover { background: rgba(26,26,46,0.04); }
.pb-side nav a.active {
  color: var(--red);
  background: transparent;
  box-shadow: none;
  font-weight: 600;
}
.pb-side nav a.active svg { opacity: 1; }
.pb-side .spacer { flex: 1; min-height: 8px; }
.pb-side .foot { display: none; }

.pb-side--collapsed {
  padding: 16px 6px;
  align-items: center;
  width: 60px;
}
.pb-side--collapsed .logo,
.pb-side--collapsed .nav-section-label { display: none; }
.pb-side--collapsed nav a {
  justify-content: center;
  gap: 0;
  min-height: 40px;
  padding: 10px 0;
}
.pb-side--collapsed nav a .nav-label {
  position: absolute;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (max-width: 980px) and (min-width: 769px) {
  .pb-side {
    width: 60px;
    padding: 16px 6px;
    align-items: center;
  }
  .pb-side .logo,
  .pb-side .nav-section-label { display: none; }
  .pb-side nav a {
    justify-content: center;
    gap: 0;
    min-height: 40px;
    padding: 10px 0;
  }
  .pb-side nav a .nav-label {
    position: absolute;
    width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
}

@media (max-width: 768px) {
  .pb-side { display: none !important; }
}
`;

function NavItem({
  label,
  href,
  Icon,
  active,
}: {
  label: string;
  href: string;
  Icon: typeof LayoutGrid;
  active: boolean;
}) {
  return (
    <Link href={href} title={label} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
      <Icon aria-hidden />
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { features } = usePlan();
  const collapsed = pathname.startsWith("/dashboard/calendar");

  const isActive = (item: NavLink) => {
    if (item.href.startsWith("mailto:")) return false;
    if (item.match === "exact" || item.href === "/dashboard") return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const showItem = (item: NavLink) => {
    if (item.gate === "metaAds") return features.metaAds;
    if (item.gate === "locationRollup") return features.locationRollup;
    return true;
  };

  return (
    <aside className={collapsed ? "pb-side pb-side--collapsed" : "pb-side"}>
      <style>{SIDEBAR_CSS}</style>
      <Link href="/dashboard" className="logo" aria-label="Posterboy home">
        posterboy
      </Link>
      <nav aria-label="Dashboard">
        <p className="nav-section-label">Main Menu</p>
        {NAV_MAIN.map((item) => (
          <NavItem
            key={item.label}
            label={item.label}
            href={item.href}
            Icon={item.Icon}
            active={isActive(item)}
          />
        ))}
        <div className="grp-gap" role="presentation" />
        <p className="nav-section-label">Other</p>
        {NAV_OTHER.filter(showItem).map((item) => (
          <NavItem
            key={item.label}
            label={item.label}
            href={item.href}
            Icon={item.Icon}
            active={isActive(item)}
          />
        ))}
      </nav>
      <div className="spacer" />
    </aside>
  );
}
