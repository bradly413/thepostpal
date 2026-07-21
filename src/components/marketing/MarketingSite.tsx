"use client";

import "@/styles/posterboy-marketing.css";
import MarketingScrollProvider from "@/components/marketing/MarketingScrollProvider";
import PosterboyCodexHome from "@/components/marketing/codex/PosterboyCodexHome";
import MarketingSiteHealthProbe from "@/components/marketing/MarketingSiteHealthProbe";

/**
 * Marketing homepage. Codex sales shell (hero + sticky capabilities + proof)
 * replaces the previous GSAP portfolio reel (RingHero / WordScroll / etc.).
 */
export default function MarketingSite() {
  const showProbe = process.env.NODE_ENV === "development";

  return (
    <MarketingScrollProvider>
      {showProbe ? <MarketingSiteHealthProbe /> : null}
      <PosterboyCodexHome />
    </MarketingScrollProvider>
  );
}
