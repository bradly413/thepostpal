"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Globe,
} from "lucide-react";
import { usePlan } from "@/components/dashboard/PlanProvider";

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
  { label: "View site", href: "/", Icon: Globe },
];

const SIDEBAR_CSS = `
.pb-side {
  --ink: #1c1c1e;
  --ink-soft: #76767e;
  --red: #ee2532;
  --line: rgba(20,20,30,0.07);
  position: sticky; top: 22px; align-self: start; height: calc(100dvh - 44px);
  display: flex; flex-direction: column; padding: 26px 20px;
  border-radius: 28px; background: rgba(255,255,255,0.78);
  backdrop-filter: blur(26px) saturate(1.5); -webkit-backdrop-filter: blur(26px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.65);
  box-shadow: 0 24px 60px -38px rgba(20,20,40,0.4), inset 0 1px 0 rgba(255,255,255,0.7);
}
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
  color: var(--ink-soft); text-decoration: none; font-size: var(--text-body); font-weight: 600;
  letter-spacing: 0.6px; text-transform: uppercase; transition: var(--transition-color);
}
.pb-side nav a svg { width: 18px; height: 18px; opacity: .85; flex-shrink: 0; }
.pb-side nav a:hover { color: var(--ink); background: rgba(20,20,40,0.04); }
.pb-side nav a.active { color: #fff; background: #c81e2a; box-shadow: 0 12px 26px -14px rgba(200,30,42,0.55); }
.pb-side nav a.active svg { color: #fff; opacity: 1; }
.pb-side .spacer { flex: 1; }
.pb-side .foot {
  display: flex; align-items: center; gap: 11px; margin-top: 16px; padding-top: 16px;
  border-top: 1px solid var(--line); background: none; border-left: 0; border-right: 0; border-bottom: 0;
  cursor: pointer; width: 100%; text-align: left; text-decoration: none;
}
.pb-side .foot .av {
  width: 34px; height: 34px; border-radius: 11px; background: linear-gradient(135deg, var(--red), #c81e2a);
  color: #fff; font-size: var(--text-caption); font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pb-side .foot .nm { font-size: var(--text-body-sm); font-weight: 600; color: var(--ink); }
.pb-side .foot .rl { font-size: var(--text-label); color: var(--ink-soft); }

/* Tablet + mobile: slim icon rail — never stack full nav above content */
@media (max-width: 980px) {
  .pb-side {
    top: 12px; height: calc(100dvh - 24px); padding: 20px 10px; align-items: center; width: 72px;
  }
  .pb-side .logo { display: none; }
  .pb-side nav { width: 100%; }
  .pb-side nav a {
    justify-content: center; gap: 0; padding: 11px 0; letter-spacing: 0;
  }
  .pb-side nav a .nav-label {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  .pb-side nav .grp-gap { margin: 8px 8px; width: calc(100% - 16px); }
  .pb-side .foot { justify-content: center; gap: 0; margin-top: 12px; padding-top: 12px; }
  .pb-side .foot .foot-text, .pb-side .foot .foot-chevron { display: none; }
}

@media (max-width: 600px) {
  .pb-side {
    top: 8px; height: calc(100dvh - 16px); width: 56px; padding: 12px 6px; border-radius: 22px;
  }
  .pb-side nav a {
    justify-content: center; min-height: 44px; padding: 12px 0; border-radius: 12px;
  }
  .pb-side nav a svg { width: 18px; height: 18px; }
  .pb-side .foot .av { width: 30px; height: 30px; border-radius: 10px; font-size: 10px; }
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
  Icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
      <Icon aria-hidden />
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { features, workspaceName, workspaceInitials, roleLabel } = usePlan();

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/" ? pathname === href : pathname.startsWith(href);

  const showItem = (item: NavLink) => {
    if (item.gate === "metaAds") return features.metaAds;
    if (item.gate === "locationRollup") return features.locationRollup;
    return true;
  };

  return (
    <aside className="pb-side">
      <style>{SIDEBAR_CSS}</style>
      <Link href="/dashboard" className="logo" aria-label="Posterboy home">
        poster<em>boy</em>
        <span className="tm">®</span>
      </Link>
      <nav aria-label="Dashboard">
        {NAV_TOP.filter(showItem).map(({ label, href, Icon }) => (
          <NavItem key={label} label={label} href={href} Icon={Icon} active={isActive(href)} />
        ))}
        <div className="grp-gap" role="presentation" />
        {NAV_BOTTOM.map(({ label, href, Icon }) => (
          <NavItem key={label} label={label} href={href} Icon={Icon} active={isActive(href)} />
        ))}
      </nav>
      <div className="spacer" />
      <Link
        href="/dashboard/settings"
        className="foot"
        aria-label={`Account settings for ${workspaceName}`}
      >
        <span className="av" aria-hidden>
          {workspaceInitials}
        </span>
        <span className="foot-text">
          <div className="nm">{workspaceName}</div>
          <div className="rl">{roleLabel}</div>
        </span>
      </Link>
    </aside>
  );
}
