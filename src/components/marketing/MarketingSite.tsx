"use client";

import "@/styles/posterboy-marketing.css";
import MarketingScrollProvider from "@/components/marketing/MarketingScrollProvider";
import Navigation from "@/components/marketing/Navigation";
import ChatbotWidget from "@/components/marketing/ChatbotWidget";
import Hero from "@/components/marketing/sections/Hero";
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
        <Navigation />
        <Hero />
        <DashboardZoomSection />
        <SchedulingCalendar />
        <BuiltForStrip />
        <Solution />
        <WordScroll />
        <AgencyMoat />
        <Pricing />
        <Footer />
        <ChatbotWidget />
      </div>
    </MarketingScrollProvider>
  );
}
