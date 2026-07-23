"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
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

/** Full page load — bypasses App Router soft-nav which was stalling from Studio/Schedule. */
function hardNav(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (href.startsWith("mailto:")) return;
  e.preventDefault();
  e.stopPropagation();
  window.location.assign(href);
}

const SIDEBAR_CSS = `
.pb-side {
  --ink: #1a1a2e;
  --ink-soft: #8b8b9a;
  --red: #ee2532;
  position: relative;
  z-index: 40;
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
}
.pb-side .logo {
  display: block;
  margin: 0 0 22px 2px;
  padding: 2px 0;
  text-decoration: none;
  cursor: pointer;
  line-height: 0;
  background: transparent;
  border-radius: 0;
  overflow: visible;
}
.pb-side .logo img {
  display: block;
  width: 168px;
  height: auto;
  max-width: 100%;
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
  width: 100%;
}
.pb-side nav .grp-gap { height: 22px; }
.pb-side nav a {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border-radius: 10px;
  color: var(--ink);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.pb-side nav a svg {
  width: 17px;
  height: 17px;
  color: currentColor;
  opacity: 0.75;
  flex-shrink: 0;
  pointer-events: none;
}
.pb-side nav a .nav-label { pointer-events: none; }
.pb-side nav a:hover { background: rgba(26,26,46,0.04); }
.pb-side nav a.active {
  color: var(--red);
  background: transparent;
  font-weight: 600;
}
.pb-side nav a.active svg { opacity: 1; }
.pb-side .spacer { flex: 1; min-height: 8px; }

/* Tablet 769–980: the shell grid (.home2) allots this cell only 52px — the
   sidebar must collapse to an icon rail or it overflows across the content
   (welcome bubble / composer / mode toggle slide under it). */
@media (max-width: 980px) and (min-width: 769px) {
  .pb-side {
    width: 52px;
    padding: 16px 6px 14px;
    align-items: center;
  }
  /* The wordmark can't survive a 52px rail — icons only (Dashboard icon
     already duplicates the logo's home link). */
  .pb-side .logo { display: none; }
  .pb-side .nav-section-label { display: none; }
  .pb-side nav { width: 100%; }
  .pb-side nav a {
    justify-content: center;
    padding: 10px 0;
  }
  .pb-side nav a .nav-label { display: none; }
  .pb-side nav .grp-gap { height: 14px; }
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
    <a
      href={href}
      title={label}
      className={active ? "active" : ""}
      aria-current={active ? "page" : undefined}
      onMouseDown={(e) => hardNav(e, href)}
      onClick={(e) => hardNav(e, href)}
    >
      <Icon aria-hidden />
      <span className="nav-label">{label}</span>
    </a>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { features } = usePlan();

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
    <aside className="pb-side" data-pb-sidebar="">
      <style>{SIDEBAR_CSS}</style>
      <a
        href="/dashboard"
        className="logo"
        aria-label="Posterboy home"
        title="Dashboard"
        onMouseDown={(e) => hardNav(e, "/dashboard")}
        onClick={(e) => hardNav(e, "/dashboard")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- brand lockup */}
        <img
          src="/brand/posterboy-wordmark.png?v=6"
          alt="posterboy™"
          width={168}
          height={56}
        />
      </a>
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
