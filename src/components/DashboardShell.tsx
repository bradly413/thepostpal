"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PageTransition from "./PageTransition";
import FeedbackWidget from "./FeedbackWidget";
import { useState, useEffect, useRef } from "react";

interface NavItem {
  label: string;
  icon: string;
  href: string;
  external?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Templates", icon: "templates", href: "/dashboard/templates" },
  { label: "Calendar", icon: "calendar", href: "/dashboard/calendar" },
  { label: "Photos", icon: "photos", href: "/dashboard/photos" },
  { label: "Videos", icon: "videos", href: "/dashboard/videos" },
];

const EXTRA_NAV: NavItem[] = [
  { label: "AI Assistant", icon: "ai", href: "/dashboard/ai-assistant" },
  { label: "Create Image", icon: "create-image", href: "/dashboard/create-image" },
  { label: "Create Video", icon: "create-video", href: "/dashboard/create-video" },
  { label: "My Brand", icon: "brand", href: "/dashboard/brand" },
  { label: "Facebook", icon: "facebook", href: "/dashboard/facebook" },
  { label: "Instagram", icon: "instagram", href: "/dashboard/instagram" },
  { label: "Vimeo", icon: "vimeo", href: "https://vimeo.com", external: true },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

const ALL_NAV: NavItem[] = [...NAV, ...EXTRA_NAV];
const NAV_ITEM_H = 36;

function SidebarIcon({ type }: { type: string }) {
  const props = { width: 18, height: 18, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": true as const };
  if (type === "dashboard")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
  if (type === "templates")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
  if (type === "calendar")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
  if (type === "ai")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
  if (type === "knowledge")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
  if (type === "create-image")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm14.25-15.75h.008v.008h-.008V5.25z" /></svg>;
  if (type === "create-video")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" /></svg>;
  if (type === "brand")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
  if (type === "facebook")
    return <svg {...props} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>;
  if (type === "instagram")
    return <svg {...props} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === "vimeo")
    return <svg {...props} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5c-.1 2.2-1.6 5.2-4.7 9-3.2 3.9-5.9 5.9-8.1 5.9-1.4 0-2.5-1.3-3.4-3.8L3.5 13c-.5-2.5-1.1-3.8-1.7-3.8-.1 0-.6.3-1.4.8L0 9.3c.9-.8 1.8-1.6 2.6-2.4C4 5.6 5 4.9 5.6 4.8c1.5-.1 2.4.9 2.7 3 .4 2.3.6 3.7.8 4.2.4 2 .9 3 1.5 3 .4 0 1.1-.7 2-2 .9-1.3 1.4-2.4 1.5-3.1.1-1.2-.3-1.8-1.4-1.8-.5 0-1 .1-1.5.3 1-3.3 2.9-4.9 5.7-4.8 2.1 0 3.1 1.4 3.1 3.9z" /></svg>;
  if (type === "photos")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>;
  if (type === "videos")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" /></svg>;
  if (type === "reports")
    return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
  return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [footerOpen, setFooterOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const contentRef = useRef<HTMLDivElement>(null);
  const [navItemH, setNavItemH] = useState(NAV_ITEM_H);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") setTheme("light");
  }, []);

  useEffect(() => {
    function measure() {
      if (!contentRef.current) return;
      const available = contentRef.current.clientHeight - 8;
      const sepH = 9;
      const totalItems = ALL_NAV.length;
      const h = Math.floor((available - sepH) / totalItems);
      setNavItemH(Math.max(30, Math.min(h, 44)));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    if (next) setFooterOpen(false);
  }

  function handleLogout() {
    document.cookie = "session=; path=/; max-age=0";
    router.push("/");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const activeIdx = ALL_NAV.findIndex((item) => isActive(item.href));
  const highlightIdx = hoverIdx ?? activeIdx;
  const separatorOffset = NAV.length;

  const NAV_PAD = 8;
  let highlightTop = -999;
  if (highlightIdx >= 0) {
    const sepsBefore = highlightIdx >= separatorOffset ? 1 : 0;
    highlightTop = NAV_PAD + highlightIdx * navItemH + sepsBefore * 9;
  }

  const navWidth = collapsed ? 72 : 240;

  return (
    <div className="ds-shell flex h-screen overflow-hidden bg-[#0c0c0e]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black">Skip to content</a>
      <style>{`
        .ds-nav {
          position: absolute;
          left: 10px;
          top: 10px;
          height: calc(100% - 20px);
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
          border-radius: 16px;
          display: none;
          flex-direction: column;
          overflow: hidden;
          user-select: none;
          z-index: 50;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease;
        }
        @media (min-width: 768px) {
          .ds-nav { display: flex; }
        }
        .ds-main { margin-left: 0; padding-top: 56px; }
        @media (min-width: 768px) {
          .ds-main { margin-left: ${navWidth + 20}px; padding-top: 0; }
        }
        .ds-mobile-header {
          display: flex;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 56px;
          align-items: center;
          padding: 0 16px;
          background: rgba(12,12,14,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          z-index: 60;
        }
        @media (min-width: 768px) {
          .ds-mobile-header { display: none; }
        }
        @keyframes drawer-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .ds-nav hr {
          margin: 0;
          margin-left: 16px;
          width: calc(100% - 32px);
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .ds-nav-content {
          flex: 1;
          padding: 4px 0;
          position: relative;
          overflow: hidden;
          direction: rtl;
        }
        .ds-nav-content::-webkit-scrollbar {
          width: 6px;
        }
        .ds-nav-content::-webkit-scrollbar-thumb {
          border-radius: 99px;
          background-color: rgba(212,168,83,0.3);
        }
        .ds-nav-item {
          position: relative;
          margin-left: 12px;
          height: ${navItemH}px;
          display: flex;
          align-items: center;
          color: rgba(255,255,255,0.55);
          direction: ltr;
          cursor: pointer;
          z-index: 1;
          transition: color 0.2s;
          text-decoration: none;
        }
        .ds-nav-item:hover, .ds-nav-item.active {
          color: #fff;
        }
        .ds-nav-item .ds-icon {
          min-width: 48px;
          display: flex;
          justify-content: center;
          transition: min-width 0.25s;
        }
        .ds-nav-item span {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: opacity 0.8s;
        }
        .ds-collapsed .ds-nav-item .ds-icon {
          min-width: calc(100% - 12px);
        }
        .ds-collapsed .ds-nav-item span {
          opacity: 0;
          transition: opacity 0.1s;
        }
        .ds-highlight {
          position: absolute;
          right: 0;
          width: calc(100% - 12px);
          height: ${navItemH}px;
          background: #0c0c0e;
          border-radius: 14px 0 0 14px;
          transition: top 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 0;
          direction: ltr;
        }
        .ds-highlight::before, .ds-highlight::after {
          content: '';
          position: absolute;
          right: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .ds-highlight::before {
          bottom: 100%;
          box-shadow: 12px 12px 0 #0c0c0e;
        }
        .ds-highlight::after {
          top: 100%;
          box-shadow: 12px -12px 0 #0c0c0e;
        }
        .ds-theme-toggle {
          position: relative;
          width: 52px;
          height: 26px;
          border-radius: 13px;
          background: rgba(59,130,246,0.12);
          border: 1px solid rgba(59,130,246,0.35);
          cursor: pointer;
          transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(59,130,246,0.15), 0 0 4px rgba(59,130,246,0.2), inset 0 0 8px rgba(59,130,246,0.08);
        }
        .ds-theme-toggle:hover {
          border-color: rgba(59,130,246,0.5);
          box-shadow: 0 0 20px rgba(59,130,246,0.25), 0 0 6px rgba(59,130,246,0.3), inset 0 0 10px rgba(59,130,246,0.1);
        }
        .ds-theme-on {
          background: rgba(59,130,246,0.08);
          border-color: rgba(59,130,246,0.2);
          box-shadow: 0 0 8px rgba(59,130,246,0.08), inset 0 0 4px rgba(59,130,246,0.05);
        }
        .ds-theme-on:hover {
          border-color: rgba(59,130,246,0.3);
          box-shadow: 0 0 12px rgba(59,130,246,0.12), inset 0 0 6px rgba(59,130,246,0.08);
        }
        .ds-theme-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(59,130,246,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.2);
        }
        .ds-theme-on .ds-theme-knob {
          left: 28px;
          background: rgba(255,255,255,0.15);
          color: rgba(0,0,0,0.4);
          box-shadow: none;
        }
        .ds-footer {
          position: relative;
          background: #1c1c22;
          border-radius: 16px;
          z-index: 2;
          transition: width 0.25s, height 0.3s;
          overflow: hidden;
        }
        .ds-footer-head {
          height: 56px;
          display: flex;
          align-items: center;
          padding: 0 12px;
        }
        .ds-footer-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(212,168,83,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #D4A853;
          flex-shrink: 0;
          transition: margin 0.25s;
        }
        .ds-collapsed .ds-footer-avatar {
          margin: 0 auto;
        }
        .ds-footer-info {
          margin-left: 12px;
          overflow: hidden;
          transition: opacity 0.8s;
        }
        .ds-collapsed .ds-footer-info,
        .ds-collapsed .ds-footer-caret {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.1s;
        }
        .ds-footer-content {
          padding: 0 16px 16px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 0 12px;
        }
      `}</style>

      {/* Mobile header */}
      <div className="ds-mobile-header">
        <button onClick={() => setMobileNav(true)} aria-label="Open navigation menu" className="p-1 text-white/60">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
        </button>
        <span className="ml-3 text-sm font-semibold text-white/80" style={{ fontFamily: "'Playfair Display', serif" }}>thepostpal</span>
      </div>

      {/* Mobile drawer overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-[70] md:hidden" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[260px] bg-[#151519] flex flex-col"
            style={{ animation: "drawer-slide 0.25s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4">
              <span className="text-lg font-semibold text-white/80" style={{ fontFamily: "'Playfair Display', serif" }}>thepostpal</span>
              <button onClick={() => setMobileNav(false)} aria-label="Close navigation menu" className="p-1 text-white/40">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
              {ALL_NAV.map((item) => {
                const cls = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive(item.href) ? "text-white bg-white/[0.08]" : "text-white/55 hover:text-white/70"
                }`;
                const children = <><SidebarIcon type={item.icon} />{item.label}</>;
                return item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
                ) : (
                  <Link key={item.label} href={item.href} onClick={() => setMobileNav(false)} className={cls}>{children}</Link>
                );
              })}
              <button
                onClick={() => { setMobileNav(false); handleLogout(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-white/55 hover:text-white/70 w-full mt-2 border-t border-white/[0.06] pt-3"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className={`ds-nav ${collapsed ? "ds-collapsed" : ""}`} style={{ width: navWidth }}>
        {/* Header */}
        <div className="relative flex items-center shrink-0" style={{ height: 80, padding: "0 8px" }}>
          {!collapsed && (
            <div className="flex-1 overflow-hidden" style={{ transition: "opacity 0.8s" }}>
              <img src={theme === "dark" ? "/logos/thepostpal-white.png" : "/logos/thepostpal-black.png"} alt="thepostpal" className="opacity-90" style={{ width: "118%", maxWidth: "none", marginLeft: "-6%", marginTop: "-4px" }} />
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            aria-label="Toggle sidebar"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white/40 hover:text-white transition-colors"
            style={collapsed ? { margin: "0 auto" } : {}}
          >
            <div className="relative w-4 h-[14px]">
              <span className={`absolute top-0 h-[2px] rounded-full bg-current transition-all duration-200 ${collapsed ? "w-[10px] translate-x-[1px] translate-y-[4px] rotate-[30deg]" : "w-4"}`} />
              <span className={`absolute top-[6px] h-[2px] rounded-full transition-all duration-200 ${collapsed ? "w-4 bg-white" : "w-0 bg-current"}`} />
              <span className={`absolute top-[12px] h-[2px] rounded-full bg-current transition-all duration-200 ${collapsed ? "w-[10px] translate-x-[1px] -translate-y-[4px] -rotate-[30deg]" : "w-3"}`} />
            </div>
          </button>
        </div>

        <hr />

        {/* Nav content */}
        <div className="ds-nav-content" ref={contentRef}>
          {NAV.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={`ds-nav-item ${isActive(item.href) ? "active" : ""}`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              title={collapsed ? item.label : undefined}
            >
              <div className="ds-icon"><SidebarIcon type={item.icon} /></div>
              <span>{item.label}</span>
            </Link>
          ))}

          <hr style={{ margin: "4px 0 4px 16px" }} />

          {EXTRA_NAV.map((item, i) => {
            const cls = `ds-nav-item ${isActive(item.href) ? "active" : ""}`;
            const handlers = {
              onMouseEnter: () => setHoverIdx(NAV.length + i),
              onMouseLeave: () => setHoverIdx(null),
              title: collapsed ? item.label : undefined,
            };
            const children = <><div className="ds-icon"><SidebarIcon type={item.icon} /></div><span>{item.label}</span></>;
            return item.external ? (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cls} {...handlers}>{children}</a>
            ) : (
              <Link key={item.label} href={item.href} className={cls} {...handlers}>{children}</Link>
            );
          })}

          {highlightIdx >= 0 && (
            <div className="ds-highlight" style={{ top: highlightTop }} />
          )}
        </div>

        {/* Footer */}
        <div
          className="ds-footer"
          style={{ height: !collapsed && footerOpen ? 140 : 56 }}
        >
          <div className="ds-footer-head">
            <div className="ds-footer-avatar">AN</div>
            {!collapsed && (
              <>
                <div className="ds-footer-info">
                  <p className="text-xs font-medium text-white truncate">Angie Nichols</p>
                  <p className="text-[10px] text-white/35">Realtor</p>
                </div>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`ds-theme-toggle ml-auto ${theme === "light" ? "ds-theme-on" : ""}`}
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <span className="ds-theme-knob">
                    {theme === "dark" ? (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                    ) : (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setFooterOpen(!footerOpen)}
                  aria-label="Toggle user menu"
                  className="ds-footer-caret p-2 text-white/30 hover:text-white transition-all"
                  style={{ transform: footerOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s, opacity 0.2s" }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
              </>
            )}
            {collapsed && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`ds-theme-toggle ${theme === "light" ? "ds-theme-on" : ""}`}
                style={{ margin: "0 auto" }}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                <span className="ds-theme-knob">
                  {theme === "dark" ? (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                  ) : (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                  )}
                </span>
              </button>
            )}
          </div>
          {!collapsed && footerOpen && (
            <div className="ds-footer-content">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full py-2 text-xs text-white/40 hover:text-white transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main id="main-content" className="flex-1 flex flex-col overflow-y-auto ds-main">
          <PageTransition>{children}</PageTransition>
        </main>
        {!pathname.startsWith("/dashboard/editor") && (
          <footer className="shrink-0 py-1 pr-4 text-right">
            <p className="text-[10px] text-text-secondary/30 tracking-wide">&copy; 2026 Bradly Robert Creative LLC. All rights reserved.</p>
          </footer>
        )}
      </div>

      <FeedbackWidget />
    </div>
  );
}
