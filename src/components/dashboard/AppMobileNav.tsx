"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Plus,
  CalendarDays,
  FileText,
  Settings,
  MoreHorizontal,
  Image as ImageIcon,
  Megaphone,
  Building2,
  BarChart3,
  X,
} from "lucide-react";
import { usePlan } from "@/components/dashboard/PlanProvider";

const MOBILE_PRIMARY = [
  { label: "Home", href: "/dashboard", Icon: Home, match: "exact" as const },
  { label: "Schedule", href: "/dashboard/calendar", Icon: CalendarDays, match: "prefix" as const },
  { label: "Create", href: "/dashboard/studio", Icon: Plus, match: "prefix" as const, emphasize: true },
  { label: "Library", href: "/dashboard/photos", Icon: ImageIcon, match: "prefix" as const },
];

const MORE_LINKS = [
  { label: "Content", href: "/dashboard/drafts", Icon: FileText },
  { label: "Reports", href: "/dashboard/settings?tab=reports", Icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", Icon: Settings },
] as const;

const MORE_GATED = [
  { label: "Ads", href: "/dashboard/ads", Icon: Megaphone, gate: "metaAds" as const },
  { label: "Channels", href: "/dashboard/organization", Icon: Building2, gate: "locationRollup" as const },
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
.pb-mobile-nav a,
.pb-mobile-nav button.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 48px;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  border-radius: 14px;
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s ease, background 0.15s ease;
  cursor: pointer;
}
.pb-mobile-nav a svg,
.pb-mobile-nav button.nav-item svg {
  width: 22px;
  height: 22px;
  opacity: 0.9;
}
.pb-mobile-nav a:active,
.pb-mobile-nav button.nav-item:active { background: rgba(20,20,40,0.04); }
.pb-mobile-nav a.active,
.pb-mobile-nav button.nav-item.active { color: var(--red); }
.pb-mobile-nav a.active svg,
.pb-mobile-nav button.nav-item.active svg { opacity: 1; }
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
.pb-mobile-more-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(28,28,30,0.28);
  backdrop-filter: blur(2px);
}
.pb-mobile-more-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 91;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0));
  background: rgba(255,255,255,0.96);
  border-radius: 20px 20px 0 0;
  border-top: 1px solid rgba(20,20,30,0.08);
  box-shadow: 0 -18px 48px -24px rgba(20,20,40,0.4);
}
.pb-mobile-more-sheet h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  color: #1c1c1e;
}
.pb-mobile-more-sheet .more-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.pb-mobile-more-sheet a {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(20,20,30,0.08);
  background: rgba(255,255,255,0.9);
  color: #1c1c1e;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}
.pb-mobile-more-sheet a svg {
  width: 18px;
  height: 18px;
  color: #76767e;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .pb-mobile-nav { display: block; }
  .pb-side { display: none !important; }
}
`;

/** Phone bottom tab bar — replaces the sidebar below 768px. */
export default function AppMobileNav() {
  const pathname = usePathname();
  const { features } = usePlan();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const isActive = (href: string, match: "exact" | "prefix") =>
    match === "exact" ? pathname === href : pathname.startsWith(href);

  const moreActive =
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/drafts") ||
    pathname.startsWith("/dashboard/editor") ||
    pathname.startsWith("/dashboard/brand") ||
    pathname.startsWith("/dashboard/ads") ||
    pathname.startsWith("/dashboard/organization") ||
    pathname.startsWith("/dashboard/templates");

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    // Move focus into the sheet so it doesn't sit behind the modal scrim.
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Cycle focus inside the sheet instead of escaping to the page behind.
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Return focus to whatever opened the sheet.
      opener?.focus?.();
    };
  }, [moreOpen]);

  return (
    <>
      <div className="pb-mobile-nav">
        <style>{MOBILE_NAV_CSS}</style>
        <nav aria-label="Primary">
          {MOBILE_PRIMARY.map(({ label, href, Icon, match, emphasize }) => {
            const active = isActive(href, match);
            return (
              <Link
                key={href}
                href={href}
                className={[emphasize ? "emphasize" : "", active ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  if (href.startsWith("mailto:")) return;
                  e.preventDefault();
                  window.location.assign(href);
                }}
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
          <button
            type="button"
            className={`nav-item${moreActive || moreOpen ? " active" : ""}`}
            aria-expanded={moreOpen}
            aria-controls={titleId}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal aria-hidden />
            <span className="nav-label">More</span>
          </button>
        </nav>
      </div>

      {moreOpen ? (
        <>
          <button
            type="button"
            className="pb-mobile-more-backdrop"
            aria-label="Close more menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            ref={sheetRef}
            className="pb-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId}>More</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1.5 text-[#76767e] hover:bg-black/[0.04] hover:text-[#1c1c1e]"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="more-grid">
              {MORE_LINKS.map(({ label, href, Icon }) => (
                <Link key={href} href={href} onClick={() => setMoreOpen(false)}>
                  <Icon aria-hidden />
                  {label}
                </Link>
              ))}
              {MORE_GATED.filter((item) =>
                item.gate === "metaAds" ? features.metaAds : features.locationRollup,
              ).map(({ label, href, Icon }) => (
                <Link key={href} href={href} onClick={() => setMoreOpen(false)}>
                  <Icon aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
