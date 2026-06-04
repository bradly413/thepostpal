"use client";

import { usePathname } from "next/navigation";
import PageTransition from "./PageTransition";
import FeedbackWidget from "./FeedbackWidget";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { DashboardHomeStyles } from "@/components/dashboard/home/dashboard-home-styles";

// ────────────────────────────────────────────────────────────────
//  DashboardShell — the single dashboard frame.
//
//  Every page renders inside the home page's .pb-home2 frame with the
//  shared AppSidebar (frosted glass, serif logo, uppercase nav). Home
//  and Studio bring their own full-bleed chrome (Studio is a 3-column
//  canvas app; Home renders its own .pb-home2 frame), so the standard
//  frame is bypassed for those two routes.
// ────────────────────────────────────────────────────────────────

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const selfFramed =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/studio");

  if (selfFramed) {
    return (
      <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-[#eceef2]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black"
        >
          Skip to content
        </a>
        <main id="main-content" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <PageTransition>
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
                {children}
              </div>
            </div>
          </PageTransition>
        </main>
        <FeedbackWidget />
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black"
      >
        Skip to content
      </a>
      <div className="pb-home2" style={{ flex: 1, minWidth: 0 }}>
        <DashboardHomeStyles />
        <div className="home2">
          <AppSidebar />
          <main id="main-content" className="main2">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <FeedbackWidget />
    </div>
  );
}
