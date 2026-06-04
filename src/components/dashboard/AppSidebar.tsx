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
  ClipboardList,
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
//  dashboard chrome. Built around the home page's .side2 design
//  (frosted glass, serif "posterboy" logo, uppercase nav, red active).
//  The ONLY serif in the dashboard is the logo.
//
//  Renders inside the .pb-home2 frame (DashboardHomeStyles provides the
//  scoped .side2 CSS), so it looks identical on every page.
// ────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
  Icon: typeof Home;
  /** Optional plan-feature gate; item hidden when the feature is off. */
  gate?: "metaAds" | "locationRollup";
}

const NAV_TOP: NavLink[] = [
  { label: "Home", href: "/dashboard", Icon: Home },
  { label: "Create", href: "/dashboard/studio", Icon: Plus },
  { label: "Schedule", href: "/dashboard/calendar", Icon: CalendarDays },
  { label: "Content", href: "/dashboard/drafts", Icon: FileText },
  { label: "Media", href: "/dashboard/photos", Icon: ImageIcon },
  { label: "Reports", href: "/dashboard/analytics", Icon: BarChart3 },
  { label: "Issues", href: "/dashboard/issues", Icon: ClipboardList },
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
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("");
  return initials || "PB";
}

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

  const topItems = NAV_TOP.filter(showItem);

  return (
    <aside className="side2">
      <Link href="/dashboard" className="logo" aria-label="Posterboy">
        poster<em>boy</em>
        <span className="tm">®</span>
      </Link>
      <nav>
        {topItems.map(({ label, href, Icon }) => (
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
