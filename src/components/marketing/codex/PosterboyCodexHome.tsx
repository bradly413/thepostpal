"use client";

/* TRC Codex shell CSS (duplicated), then Posterboy token/nav overrides */
import "./codex-home.css";
import "./sticky-service-cards.css";
import "./posterboy-overrides.css";

import CodexNav from "@/components/marketing/codex/CodexNav";
import Hero from "@/components/marketing/codex/Hero";
import Relief from "@/components/marketing/codex/Relief";
import SayItWalkthrough from "@/components/marketing/codex/SayItWalkthrough";
import Demonstration from "@/components/marketing/codex/Demonstration";
import MadeWith from "@/components/marketing/codex/MadeWith";
import HonestComparison from "@/components/marketing/codex/HonestComparison";
import SoloCommandFork from "@/components/marketing/codex/SoloCommandFork";
import Faq from "@/components/marketing/codex/Faq";
import FinalCta from "@/components/marketing/codex/FinalCta";
import Pricing from "@/components/marketing/sections/Pricing";
import Footer from "@/components/marketing/sections/Footer";

/**
 * Done-for-you conversion homepage ("Calm Demo" system):
 * promise → relief → how it works → demonstration → sample weeks →
 * honest comparison → Solo/Command fork → pricing → FAQ → final CTA.
 */
export default function PosterboyCodexHome() {
  return (
    <div className="cx-page">
      <CodexNav />
      <div className="cx">
        <div className="frame" id="top">
          <Hero />
        </div>
      </div>

      <div className="pb-cx-embed">
        <Relief />
        <SayItWalkthrough />
        <Demonstration />
        <MadeWith />
        <HonestComparison />
        <SoloCommandFork />
        <Pricing />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </div>
  );
}
