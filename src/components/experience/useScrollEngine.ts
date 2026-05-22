"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { CHAPTERS, chapterIndex, SPINE_VH } from "@/lib/experience/chapters";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollEngineState {
  progress: number;
  chapter: number;
  spineRef: React.RefObject<HTMLDivElement | null>;
  stickyRef: React.RefObject<HTMLDivElement | null>;
}

export function useScrollEngine(): ScrollEngineState {
  const spineRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [chapter, setChapter] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);

  const onProgress = useCallback((p: number) => {
    setProgress(p);
    setChapter(chapterIndex(p));
  }, []);

  useEffect(() => {
    const spine = spineRef.current;
    const sticky = stickyRef.current;
    if (!spine || !sticky) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }

    document.body.classList.add("pb-xp-active");

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const tickerRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerRaf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && value !== undefined) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
    });

    const st = ScrollTrigger.create({
      trigger: spine,
      start: "top top",
      end: "bottom bottom",
      pin: sticky,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => onProgress(self.progress),
    });

    ScrollTrigger.refresh();

    return () => {
      st.kill();
      gsap.ticker.remove(tickerRaf);
      lenis.destroy();
      lenisRef.current = null;
      document.body.classList.remove("pb-xp-active");
      ScrollTrigger.scrollerProxy(document.documentElement, {});
    };
  }, [onProgress]);

  return { progress, chapter, spineRef, stickyRef };
}

export { SPINE_VH, CHAPTERS };
