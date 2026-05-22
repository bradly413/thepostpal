"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARKETING_IMAGES } from "@/lib/marketing-images";
import { marketingDbg } from "@/lib/marketing-debug";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

const SECTION_IDS = ["hero", "problem", "manifesto", "solution", "wordscroll", "features", "founder", "pricing"];

async function probeAsset(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return { url, status: res.status, ok: res.ok, redirected: res.redirected };
  } catch (err) {
    return { url, status: 0, ok: false, error: String(err) };
  }
}

export default function MarketingSiteHealthProbe() {
  const { ready, reducedMotion } = useMarketingScroll();

  useEffect(() => {
    // #region agent log
    marketingDbg(
      "MarketingSiteHealthProbe.tsx:mount",
      "marketing-site-mounted",
      { path: window.location.pathname, vw: window.innerWidth, vh: window.innerHeight },
      "B",
    );
    // #endregion

    const assets = [MARKETING_IMAGES.appIcon, MARKETING_IMAGES.carousel1];
    Promise.all(assets.map(probeAsset)).then((results) => {
      // #region agent log
      marketingDbg(
        "MarketingSiteHealthProbe.tsx:assets",
        "asset-head-probe",
        { results, reducedMotion },
        "A",
      );
      // #endregion
    });
  }, []);

  useEffect(() => {
    if (!ready) return;

    // #region agent log
    marketingDbg(
      "MarketingSiteHealthProbe.tsx:ready",
      "scroll-engine-ready",
      {
        scrollTriggerCount: ScrollTrigger.getAll().length,
        scrollY: window.scrollY,
        docHeight: document.documentElement.scrollHeight,
      },
      "D",
    );
    // #endregion

    const visibility: Record<string, number> = {};
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id || "unknown";
          visibility[id] = Math.round(e.intersectionRatio * 100) / 100;
        }
        // #region agent log
        marketingDbg(
          "MarketingSiteHealthProbe.tsx:io",
          "section-visibility",
          { visibility, scrollY: window.scrollY },
          "E",
        );
        // #endregion
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    let scrollTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const iconSlot = document.querySelector<HTMLElement>(".hero-icon-slot");
        const iconImg = document.querySelector<HTMLImageElement>(".hero-icon-slot img");
        const style = iconSlot ? getComputedStyle(iconSlot) : null;
        const imgStyle = iconImg ? getComputedStyle(iconImg) : null;
        // #region agent log
        marketingDbg(
          "MarketingSiteHealthProbe.tsx:scroll",
          "scroll-snapshot",
          {
            scrollY: window.scrollY,
            iconSlotOpacity: style?.opacity,
            iconSlotVisibility: style?.visibility,
            imgOpacity: imgStyle?.opacity,
            imgDisplay: imgStyle?.display,
            imgNaturalWidth: iconImg?.naturalWidth ?? 0,
            imgComplete: iconImg?.complete ?? false,
            imgSrc: iconImg?.currentSrc || iconImg?.src || null,
          },
          "C",
        );
        // #endregion
      }, 400);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimer);
    };
  }, [ready]);

  return null;
}
