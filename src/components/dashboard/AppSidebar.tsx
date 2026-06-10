"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Plus,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Megaphone,
  Building2,
  PenLine,
  Hexagon,
  Settings,
  ChevronDown,
} from "lucide-react";
import { usePlan } from "@/components/dashboard/PlanProvider";

// ────────────────────────────────────────────────────────────────
//  Shared dashboard sidebar — the single source of truth for the
//  dashboard chrome. Built around the home page's design (frosted
//  glass, serif "posterboy" logo, uppercase nav, red active). The ONLY
//  serif in the dashboard is this logo.
//
//  Fully self-contained (own scoped styles under .pb-side) so it drops
//  into ANY context identically — the home frame, content pages, and
//  the Studio canvas app.
// ────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
  Icon: typeof Home;
  gate?: "metaAds" | "locationRollup";
}

const NAV_TOP: NavLink[] = [
  { label: "Home", href: "/dashboard", Icon: Home },
  { label: "Create", href: "/dashboard/studio", Icon: Plus },
  { label: "Schedule", href: "/dashboard/calendar", Icon: CalendarDays },
  { label: "Content", href: "/dashboard/drafts", Icon: FileText },
  { label: "Media", href: "/dashboard/photos", Icon: ImageIcon },
  { label: "Reports", href: "/dashboard/analytics", Icon: BarChart3 },
  { label: "Ads", href: "/dashboard/ads", Icon: Megaphone, gate: "metaAds" },
  { label: "Channels", href: "/dashboard/organization", Icon: Building2, gate: "locationRollup" },
];

const NAV_BOTTOM: NavLink[] = [
  { label: "Editor", href: "/dashboard/editor", Icon: PenLine },
  { label: "Brand", href: "/dashboard/brand", Icon: Hexagon },
  { label: "Settings", href: "/dashboard/settings", Icon: Settings },
];

interface MeInfo {
  name: string;
  initials: string;
  role: string;
}

function deriveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "PB";
}

const SIDEBAR_CSS = `
.pb-side {
  --ink: #1c1c1e;
  --ink-soft: #76767e;
  --red: #ee2532;
  --line: rgba(20,20,30,0.07);
  position: sticky; top: 22px; align-self: start; height: calc(100vh - 44px);
  display: flex; flex-direction: column; padding: 26px 20px;
  border-radius: 28px; background: rgba(255,255,255,0.78);
  backdrop-filter: blur(26px) saturate(1.5); -webkit-backdrop-filter: blur(26px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.65);
  box-shadow: 0 24px 60px -38px rgba(20,20,40,0.4), inset 0 1px 0 rgba(255,255,255,0.7);
}
@media (max-width: 980px) { .pb-side { height: auto; position: relative; top: 0; } }
.pb-side .logo {
  font-family: var(--font-playfair, var(--font-instrument-serif, Georgia, serif));
  font-size: 30px; font-weight: 500; letter-spacing: -0.5px; color: var(--ink);
  text-decoration: none; margin-bottom: 34px; display: inline-flex; align-items: baseline; line-height: 1;
}
.pb-side .logo em { font-style: italic; font-weight: 500; }
.pb-side .logo .tm { font-style: normal; font-size: 0.3em; font-weight: 500; transform: translateY(-0.9em); margin-left: 2px; }
.pb-side nav { display: flex; flex-direction: column; gap: 3px; }
.pb-side nav .grp-gap { height: 22px; margin: 8px 0; border-top: 1px solid var(--line); }
.pb-side nav a {
  display: flex; align-items: center; gap: 13px; padding: 11px 13px; border-radius: 14px;
  color: var(--ink-soft); text-decoration: none; font-size: 13.5px; font-weight: 600;
  letter-spacing: 0.6px; text-transform: uppercase; transition: color .2s, background .2s;
}
.pb-side nav a svg { width: 18px; height: 18px; opacity: .85; }
.pb-side nav a:hover { color: var(--ink); background: rgba(20,20,40,0.04); }
.pb-side nav a.active { color: #fff; background: var(--red); box-shadow: 0 12px 26px -14px rgba(238,37,50,0.55); }
.pb-side nav a.active svg { color: #fff; opacity: 1; }
.pb-side .spacer { flex: 1; }
.pb-side .foot {
  display: flex; align-items: center; gap: 11px; margin-top: 16px; padding-top: 16px;
  border-top: 1px solid var(--line); background: none; border: 0; border-top: 1px solid var(--line);
  cursor: pointer; width: 100%; text-align: left; text-decoration: none;
}
.pb-side .foot .av {
  width: 34px; height: 34px; border-radius: 11px; background: linear-gradient(135deg, var(--red), #c81e2a);
  color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pb-side .foot .nm { font-size: 13px; font-weight: 600; color: var(--ink); }
.pb-side .foot .rl { font-size: 11px; color: var(--ink-soft); }
`;

export default function AppSidebar() {
  const pathname = usePathname();
  const { features } = usePlan();
  const [me, setMe] = useState<MeInfo>({ name: "Your workspace", initials: "PB", role: "Owner" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          role?: string;
          organization?: { name?: string };
        };
        if (cancelled) return;
        const name = data.organization?.name?.trim() || "Your workspace";
        setMe({
          name,
          initials: deriveInitials(name),
          role: data.role === "admin" ? "Owner" : data.role || "Member",
        });
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const showItem = (item: NavLink) => {
    if (item.gate === "metaAds") return features.metaAds;
    if (item.gate === "locationRollup") return features.locationRollup;
    return true;
  };

  return (
    <aside className="pb-side">
      <style>{SIDEBAR_CSS}</style>
      <Link href="/dashboard" className="logo" aria-label="Posterboy">
        poster<em>boy</em>
        <span className="tm">®</span>
      </Link>
      <nav>
        {NAV_TOP.filter(showItem).map(({ label, href, Icon }) => (
          <Link key={label} href={href} className={isActive(href) ? "active" : ""}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
        <div className="grp-gap" />
        {NAV_BOTTOM.map(({ label, href, Icon }) => (
          <Link key={label} href={href} className={isActive(href) ? "active" : ""}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="spacer" />
      <Link href="/dashboard/settings" className="foot" aria-label="Account">
        <span className="av">{me.initials}</span>
        <span>
          <div className="nm">{me.name}</div>
          <div className="rl">{me.role}</div>
        </span>
        <ChevronDown size={15} style={{ marginLeft: "auto", color: "var(--ink-soft)" }} />
      </Link>
    </aside>
  );
}
