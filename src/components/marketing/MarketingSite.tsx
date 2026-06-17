"use client";

import "@/styles/posterboy-marketing.css";
import MarketingScrollProvider from "@/components/marketing/MarketingScrollProvider";
import MarketingReveal from "@/components/marketing/MarketingReveal";
import Navigation from "@/components/marketing/Navigation";
import ChatbotWidget from "@/components/marketing/ChatbotWidget";
import RingHero from "@/components/marketing/sections/RingHero";
import TryIt from "@/components/marketing/sections/TryIt";
import TheAlternatives from "@/components/marketing/sections/TheAlternatives";
import DashboardZoomSection from "@/components/marketing/sections/DashboardZoomSection";
import SchedulingCalendar from "@/components/marketing/sections/SchedulingCalendar";
import BuiltForStrip from "@/components/marketing/sections/BuiltForStrip";
import Solution from "@/components/marketing/sections/Solution";
import WordScroll from "@/components/marketing/sections/WordScroll";
import AgencyMoat from "@/components/marketing/sections/AgencyMoat";
import Pricing from "@/components/marketing/sections/Pricing";
import Footer from "@/components/marketing/sections/Footer";
import MarketingSiteHealthProbe from "@/components/marketing/MarketingSiteHealthProbe";

export default function MarketingSite() {
  const showProbe = process.env.NODE_ENV === "development";

  return (
    <MarketingScrollProvider>
      {showProbe ? <MarketingSiteHealthProbe /> : null}
      <div className="pb-marketing-site">
        <MarketingReveal />
        <Navigation />
        <RingHero />
        {/* The sell, in order: promise -> live proof -> the honest VS ->
            how it works -> why it's safe -> the workspace -> who it's for ->
            the feeling -> the price. */}
        <TryIt />
        <TheAlternatives />
        <Solution />
        <AgencyMoat />
        <DashboardZoomSection />
        <SchedulingCalendar />
        <BuiltForStrip />
        <WordScroll />
        <Pricing />
        <Footer />
        <ChatbotWidget />
      </div>
    </MarketingScrollProvider>
  );
}
