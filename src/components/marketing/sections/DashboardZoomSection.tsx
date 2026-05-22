"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

gsap.registerPlugin(ScrollTrigger);

const DASHBOARD_SRC = "/images/posterboy-dashboard-zoom.png";
const DASHBOARD_SRC_2X = "/images/posterboy-dashboard-zoom@2x.png";
const DASHBOARD_WIDTH = 2048;
const DASHBOARD_HEIGHT = 1258;
const HEADLINE =
  "Say goodbye to the newsfeed and complicated business suites.";

const ZOOM_IN_END = 0.42;
const HOLD_END = 0.58;

/** Scale iPad device to fit inside viewport — never full-bleed. */
function confinedZoomScale(device: HTMLElement): number {
  const w = device.offsetWidth || 1;
  const h = device.offsetHeight || 1;
  const padX = window.innerWidth * 0.07;
  const padY = window.innerHeight * 0.14;
  const fit = Math.min(
    (window.innerWidth - padX * 2) / w,
    (window.innerHeight - padY * 2) / h,
  );
  return Math.min(Math.max(fit, 1), 1.75);
}

function applyZoomProgress(
  progress: number,
  maxScale: number,
  device: HTMLElement,
  headline: HTMLHeadingElement | null,
) {
  let scale = 1;
  let headlineOp = 1;
  let headlineY = 0;

  if (progress <= ZOOM_IN_END) {
    const t = progress / ZOOM_IN_END;
    scale = 1 + (maxScale - 1) * t;
    headlineOp = 1 - t;
    headlineY = -18 * t;
  } else if (progress <= HOLD_END) {
    scale = maxScale;
    headlineOp = 0;
    headlineY = -18;
  } else {
    const t = (progress - HOLD_END) / (1 - HOLD_END);
    scale = maxScale + (1 - maxScale) * t;
    headlineOp = t;
    headlineY = -18 * (1 - t);
  }

  gsap.set(device, { scale, force3D: true });
  if (headline) gsap.set(headline, { opacity: headlineOp, y: headlineY });
}

/**
 * Sticky stage + scrubbed scale (no GSAP pin — avoids Lenis / pin-spacer glitches).
 */
export default function DashboardZoomSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const maxScaleRef = useRef(1);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const section = sectionRef.current;
      const device = deviceRef.current;
      const headline = headlineRef.current;
      if (!section || !device) return;

      const syncMaxScale = () => {
        maxScaleRef.current = confinedZoomScale(device);
      };
      syncMaxScale();

      const onResize = () => {
        syncMaxScale();
        scheduleMarketingScrollRefresh(120);
      };
      window.addEventListener("resize", onResize);
      ScrollTrigger.addEventListener("refreshInit", syncMaxScale);

      gsap.set(device, { scale: 1, transformOrigin: "50% 50%", force3D: true });
      if (headline) gsap.set(headline, { opacity: 1, y: 0 });

      if (reducedMotion) {
        applyZoomProgress(0, 1, device, headline);
        return () => {
          window.removeEventListener("resize", onResize);
          ScrollTrigger.removeEventListener("refreshInit", syncMaxScale);
        };
      }

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.75,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          applyZoomProgress(self.progress, maxScaleRef.current, device, headline);
        },
      });

      applyZoomProgress(st.progress, maxScaleRef.current, device, headline);
      scheduleMarketingScrollRefresh(200);

      return () => {
        window.removeEventListener("resize", onResize);
        ScrollTrigger.removeEventListener("refreshInit", syncMaxScale);
        st.kill();
      };
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section
      ref={sectionRef}
      id="product"
      className="pb-dash-zoom"
      aria-label="Posterboy dashboard on iPad"
    >
      <div className="pb-dash-zoom-stage">
        <h2 ref={headlineRef} className="pb-dash-zoom-headline type-display">
          {HEADLINE}
        </h2>

        <div ref={deviceRef} className="pb-ipad-device">
          <div className="pb-ipad-shell">
            <span className="pb-ipad-camera-pill" aria-hidden />
            <div className="pb-ipad-screen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DASHBOARD_SRC}
                srcSet={`${DASHBOARD_SRC} 1024w, ${DASHBOARD_SRC_2X} 2048w`}
                sizes="(min-width: 960px) 960px, 88vw"
                width={DASHBOARD_WIDTH}
                height={DASHBOARD_HEIGHT}
                alt="Posterboy dashboard on iPad"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={() => scheduleMarketingScrollRefresh(100)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
