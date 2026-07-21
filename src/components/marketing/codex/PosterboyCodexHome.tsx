"use client";

/* TRC Codex shell CSS (duplicated), then Posterboy token/nav overrides */
import "./codex-home.css";
import "./sticky-service-cards.css";
import "./posterboy-overrides.css";

import CodexNav from "@/components/marketing/codex/CodexNav";
import HeroDemo from "@/components/marketing/codex/HeroDemo";
import ProofStrip from "@/components/marketing/codex/ProofStrip";
import StudioToPost from "@/components/marketing/codex/StudioToPost";
import SayItWalkthrough from "@/components/marketing/codex/SayItWalkthrough";
import HonestComparison from "@/components/marketing/codex/HonestComparison";
import CaseStudies from "@/components/marketing/codex/CaseStudies";
import WhatWeHandle from "@/components/marketing/codex/WhatWeHandle";
import Faq from "@/components/marketing/codex/Faq";
import FooterCta from "@/components/marketing/codex/FooterCta";
import Pricing from "@/components/marketing/sections/Pricing";
import Footer from "@/components/marketing/sections/Footer";

/**
 * Product-led conversion homepage, in order:
 * live-demo hero → proof strip → studio-to-post → "Say it. It's made."
 * walkthrough → honest comparison → case studies → what we handle →
 * pricing → FAQ → footer CTA + footer.
 */
export default function PosterboyCodexHome() {
  return (
    <div className="cx-page">
      <CodexNav />
      <div className="cx">
        <div className="frame" id="top">
          <HeroDemo />
        </div>
      </div>

      <div className="pb-cx-embed">
        <ProofStrip />
        <StudioToPost />
        <SayItWalkthrough />
        <HonestComparison />
        <CaseStudies />
        <WhatWeHandle />
        <Pricing />
        <Faq />
        <FooterCta />
        <Footer />
      </div>
    </div>
  );
}
