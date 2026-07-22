"use client";

/* TRC Codex shell CSS (duplicated), then Posterboy token/nav overrides */
import "./codex-home.css";
import "./sticky-service-cards.css";
import "./posterboy-overrides.css";

import CodexNav from "@/components/marketing/codex/CodexNav";
import Hero from "@/components/marketing/codex/Hero";
import ProductGallery from "@/components/marketing/codex/ProductGallery";
import DeliverableBand from "@/components/marketing/codex/DeliverableBand";
import Relief from "@/components/marketing/codex/Relief";
import HonestComparison from "@/components/marketing/codex/HonestComparison";
import SayItWalkthrough from "@/components/marketing/codex/SayItWalkthrough";
import Demonstration from "@/components/marketing/codex/Demonstration";
import MadeWith from "@/components/marketing/codex/MadeWith";
import SoloCommandFork from "@/components/marketing/codex/SoloCommandFork";
import Faq from "@/components/marketing/codex/Faq";
import FinalCta from "@/components/marketing/codex/FinalCta";
import Pricing from "@/components/marketing/sections/Pricing";
import Footer from "@/components/marketing/sections/Footer";

/**
 * Conversion spine:
 * hero → pillars → gallery → relief → comparison → workflow →
 * live demo → examples → Solo/Command → pricing → FAQ → final CTA.
 */
export default function PosterboyCodexHome() {
  return (
    <div className="cx-page pbv-jitter">
      <CodexNav />
      <div className="cx">
        <div className="frame" id="top">
          <Hero />
          <DeliverableBand />
          <ProductGallery />
        </div>
      </div>

      <div className="pb-cx-embed">
        <Relief />
        <HonestComparison />
        <SayItWalkthrough />
        <Demonstration />
        <MadeWith />
        <SoloCommandFork />
        <Pricing />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </div>
  );
}
