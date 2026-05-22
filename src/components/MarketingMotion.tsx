"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

interface MarketingMotionProps {
  children: React.ReactNode;
}

export default function MarketingMotion({ children }: MarketingMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function setViewportUnits() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      document.documentElement.style.setProperty("--svh", `${vh}px`);
    }
    setViewportUnits();
    window.addEventListener("resize", setViewportUnits);
    return () => window.removeEventListener("resize", setViewportUnits);
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reducedMotion) {
        return;
      }

      const setup = () => {
        let lenis: Lenis | null = null;
        let tickerRaf: ((time: number) => void) | null = null;

        try {
          lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
          tickerRaf = (time: number) => lenis!.raf(time * 1000);
          gsap.ticker.add(tickerRaf);
          gsap.ticker.lagSmoothing(0);
          lenis.on("scroll", ScrollTrigger.update);
        } catch {
          // Lenis optional
        }

        const heroEls = gsap.utils.toArray<HTMLElement>(".pb-hero-in", root);
        if (heroEls.length) {
          gsap.fromTo(
            heroEls,
            { y: 28, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power2.out", delay: 0.08 },
          );
        }

        gsap.utils.toArray<HTMLElement>(".pb-reveal", root).forEach((el) => {
          gsap.fromTo(
            el,
            { y: 22, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.75,
              ease: "power2.out",
              immediateRender: false,
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
                once: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>(".pb-reveal-group", root).forEach((group) => {
          const items = group.querySelectorAll(".pb-reveal-item");
          if (!items.length) return;
          gsap.fromTo(
            items,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.65,
              stagger: 0.09,
              ease: "power2.out",
              immediateRender: false,
              scrollTrigger: {
                trigger: group,
                start: "top 82%",
                once: true,
              },
            },
          );
        });

        const indicatorBar = root.querySelector(".pb-scroll-indicator__bar");
        if (indicatorBar) {
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
              gsap.set(indicatorBar, { scaleY: self.progress, transformOrigin: "top center" });
            },
          });
        }

        ScrollTrigger.refresh();

        return () => {
          if (tickerRaf) gsap.ticker.remove(tickerRaf);
          lenis?.destroy();
        };
      };

      const cleanup = setup();
      return cleanup;
    },
    { scope: rootRef, dependencies: [] },
  );

  return (
    <div ref={rootRef} className="pb-motion-root pb-motion-ready">
      <div className="pb-scroll-indicator" aria-hidden="true">
        <div className="pb-scroll-indicator__track" />
        <div className="pb-scroll-indicator__bar" />
      </div>
      {children}
    </div>
  );
}
