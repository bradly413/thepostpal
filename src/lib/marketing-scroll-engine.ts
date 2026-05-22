import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

let refreshQueued = false;

/** Debounced global refresh after layout/images settle. */
export function scheduleMarketingScrollRefresh(delayMs = 80) {
  if (refreshQueued) return;
  refreshQueued = true;
  window.setTimeout(() => {
    refreshQueued = false;
    ScrollTrigger.refresh(true);
  }, delayMs);
}

export function initMarketingScrollConfig() {
  ScrollTrigger.config({
    ignoreMobileResize: true,
    limitCallbacks: true,
  });

  ScrollTrigger.defaults({
    anticipatePin: 1,
  });
}

/** Keep ScrollTrigger in sync with Lenis — prevents pin/scroll glitches. */
export function connectLenisScrollTrigger(lenis: Lenis) {
  const scroller = document.documentElement;

  ScrollTrigger.scrollerProxy(scroller, {
    scrollTop(value) {
      if (typeof value === "number") {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
  });

  const onRefresh = () => {
    lenis.resize();
  };
  ScrollTrigger.addEventListener("refresh", onRefresh);

  return () => {
    ScrollTrigger.scrollerProxy(scroller, {});
    ScrollTrigger.removeEventListener("refresh", onRefresh);
  };
}
