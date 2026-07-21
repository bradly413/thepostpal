"use client";

/* TRC Codex shell CSS (duplicated), then Posterboy token/nav overrides */
import "./codex-home.css";
import "./sticky-service-cards.css";
import "./posterboy-overrides.css";

import CodexNav from "@/components/marketing/codex/CodexNav";
import CodexHero from "@/components/marketing/codex/CodexHero";
import HowItWorks from "@/components/marketing/codex/HowItWorks";
import ProofBeat from "@/components/marketing/codex/ProofBeat";
import TeamsPitch from "@/components/marketing/codex/TeamsPitch";
import Faq from "@/components/marketing/codex/Faq";
import Pricing from "@/components/marketing/sections/Pricing";
import Footer from "@/components/marketing/sections/Footer";

/**
 * Munch-style conversion spine with Posterboy warm-light brand + real product demos.
 */
export default function PosterboyCodexHome() {
  return (
    <div className="cx-page">
      <CodexNav />
      <div className="cx">
        <div className="frame" id="top">
          <CodexHero />
        </div>
      </div>

      <div className="pb-cx-embed">
        <HowItWorks />
        <ProofBeat />
        <TeamsPitch />
        <Faq />
        <Pricing />
        <Footer />
      </div>
    </div>
  );
}
