"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {
  connectLenisScrollTrigger,
  initMarketingScrollConfig,
  scheduleMarketingScrollRefresh,
} from "@/lib/marketing-scroll-engine";
import { scrollToMarketingAnchor } from "@/lib/marketing-scroll-anchor";

gsap.registerPlugin(ScrollTrigger);

type MarketingScrollContextValue = {
  ready: boolean;
  reducedMotion: boolean;
  scrollToAnchor: (selector: string) => void;
};

const MarketingScrollContext = createContext<MarketingScrollContextValue>({
  ready: false,
  reducedMotion: false,
  scrollToAnchor: () => {},
});

export function useMarketingScroll() {
  return useContext(MarketingScrollContext);
}

export default function MarketingScrollProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // The hero is a pinned, scroll-scrubbed sequence — always open it on the
    // first frame (the ring), never mid-timeline. Browsers default to
    // restoring the prior scroll position on reload, which would drop a
    // returning/reloading visitor into the middle of the collapse/cascade.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    initMarketingScrollConfig();

    const setVh = () =>
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    setVh();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      setVh();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => scheduleMarketingScrollRefresh(120), 150);
    };

    const onLoad = () => scheduleMarketingScrollRefresh(50);

    window.addEventListener("resize", onResize);
    window.addEventListener("load", onLoad);

    let tickerRaf: ((time: number) => void) | null = null;
    let disconnectLenisSt: (() => void) | null = null;

    if (!reduced) {
      document.documentElement.classList.add("lenis", "lenis-smooth");

      const lenis = new Lenis({
        // Duration + a soft expo-out easing gives a deliberate, premium glide
        // (more "designed" than a raw lerp). Tune `duration` for weight.
        duration: 1.05,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
        wheelMultiplier: 0.92,
        touchMultiplier: 1.2,
        syncTouch: true,
      });
      lenisRef.current = lenis;

      disconnectLenisSt = connectLenisScrollTrigger(lenis);
      lenis.on("scroll", ScrollTrigger.update);

      tickerRaf = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tickerRaf);
      gsap.ticker.lagSmoothing(0);
    }

    requestAnimationFrame(() => {
      scheduleMarketingScrollRefresh(0);
      requestAnimationFrame(() => {
        scheduleMarketingScrollRefresh(0);
        setReady(true);
        scheduleMarketingScrollRefresh(200);
        scheduleMarketingScrollRefresh(700);
      });
    });

    return () => {
      setReady(false);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
      clearTimeout(resizeTimer);
      if (tickerRaf) gsap.ticker.remove(tickerRaf);
      disconnectLenisSt?.();
      lenisRef.current?.destroy();
      lenisRef.current = null;
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, []);

  const scrollToAnchor = (selector: string) => {
    scrollToMarketingAnchor(selector, lenisRef.current);
  };

  return (
    <MarketingScrollContext.Provider
      value={{ ready, reducedMotion, scrollToAnchor }}
    >
      {children}
    </MarketingScrollContext.Provider>
  );
}
