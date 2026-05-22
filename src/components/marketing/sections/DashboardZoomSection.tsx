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

const KICKER = "Inside posterboy";
const HEADLINE =
  "Say goodbye to the newsfeed and complicated business suites.";
const LEDE =
  "A calm room for the work the algorithm can't do for you. Drafts in your voice, a calendar that already knows your week, posts that show up while you're somewhere else.";

const STATS: { value: string; label: string }[] = [
  { value: "3", label: "drafts in your voice" },
  { value: "2", label: "scheduled this week" },
  { value: "1", label: "already live" },
];

const ANNOTATIONS: {
  className: string;
  kicker: string;
  title: string;
  meta: string;
  mark: "check" | "dot" | "arrow";
}[] = [
  {
    className: "pb-dash-anno pb-dash-anno--tl",
    kicker: "Draft",
    title: "Saved in your voice",
    meta: "2:14 PM",
    mark: "check",
  },
  {
    className: "pb-dash-anno pb-dash-anno--br",
    kicker: "Sent",
    title: "Instagram · Facebook",
    meta: "Today, 8:00 AM",
    mark: "arrow",
  },
  {
    className: "pb-dash-anno pb-dash-anno--bl",
    kicker: "Brand voice",
    title: "Warm. Local. Considered.",
    meta: "Updated this week",
    mark: "dot",
  },
];

/**
 * Living workspace — editorial copy on the left, dashboard mockup on the right
 * at modest scale, with a few quiet ambient annotations layered around it.
 *
 * No scroll-jacked zoom: replaced the 220vh sticky stage with a calm,
 * single-viewport editorial layout. Motion is one staggered entrance on
 * enter; nothing chases the scrollbar.
 */
export default function DashboardZoomSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const section = sectionRef.current;
      if (!section) return;

      const kicker = section.querySelector<HTMLElement>(".pb-dash-zoom-kicker");
      const headline = section.querySelector<HTMLElement>(".pb-dash-zoom-headline");
      const lede = section.querySelector<HTMLElement>(".pb-dash-zoom-lede");
      const stats = section.querySelectorAll<HTMLElement>(".pb-dash-zoom-stat");
      const device = section.querySelector<HTMLElement>(".pb-ipad-device");
      const annos = section.querySelectorAll<HTMLElement>(".pb-dash-anno");

      if (reducedMotion) {
        // Snap everything to its final state and bail — no motion.
        const all: (HTMLElement | NodeListOf<HTMLElement>)[] = [
          kicker, headline, lede, device, stats, annos,
        ].filter(Boolean) as never;
        all.forEach((el) => gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1 }));
        return;
      }

      // Initial state — slight rise, transparent.
      gsap.set([kicker, headline, lede, ...Array.from(stats)].filter(Boolean), {
        opacity: 0,
        y: 24,
      });
      if (device) gsap.set(device, { opacity: 0, y: 40, scale: 0.985 });
      gsap.set(Array.from(annos), { opacity: 0, y: 16 });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      if (kicker) tl.to(kicker, { opacity: 1, y: 0, duration: 0.55 }, 0);
      if (headline) tl.to(headline, { opacity: 1, y: 0, duration: 0.75 }, 0.08);
      if (lede) tl.to(lede, { opacity: 1, y: 0, duration: 0.7 }, 0.2);
      if (stats.length) {
        tl.to(
          stats,
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 },
          0.3,
        );
      }
      if (device) {
        tl.to(device, { opacity: 1, y: 0, scale: 1, duration: 0.95 }, 0.15);
      }
      if (annos.length) {
        // Annotations land after the dashboard so they read as
        // "settling onto" the workspace rather than racing it in.
        tl.to(
          annos,
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.14 },
          0.6,
        );
      }

      scheduleMarketingScrollRefresh(180);

      return () => {
        tl.kill();
      };
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section
      ref={sectionRef}
      id="product"
      className="pb-dash-zoom"
      aria-label="Inside Posterboy — a calm workspace for social posts"
    >
      <div className="pb-dash-zoom-stage">
        <div className="pb-dash-zoom-copy">
          <p className="pb-dash-zoom-kicker">{KICKER}</p>
          <h2 className="pb-dash-zoom-headline type-display">{HEADLINE}</h2>
          <p className="pb-dash-zoom-lede">{LEDE}</p>
          <dl className="pb-dash-zoom-stats" aria-label="Your week at a glance">
            {STATS.map((s) => (
              <div key={s.label} className="pb-dash-zoom-stat">
                <dt className="pb-dash-zoom-stat-value">{s.value}</dt>
                <dd className="pb-dash-zoom-stat-label">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="pb-dash-zoom-canvas">
          <div className="pb-ipad-device">
            <div className="pb-ipad-shell">
              <div className="pb-ipad-screen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DASHBOARD_SRC}
                  srcSet={`${DASHBOARD_SRC} 1024w, ${DASHBOARD_SRC_2X} 2048w`}
                  sizes="(min-width: 1280px) 680px, (min-width: 960px) 56vw, 92vw"
                  width={DASHBOARD_WIDTH}
                  height={DASHBOARD_HEIGHT}
                  alt="Posterboy workspace — drafts, brand voice, and schedule"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => scheduleMarketingScrollRefresh(100)}
                />
              </div>
            </div>

            {ANNOTATIONS.map((a) => (
              <div key={a.kicker + a.title} className={a.className} aria-hidden>
                <span className={`pb-dash-anno-mark pb-dash-anno-mark--${a.mark}`}>
                  {a.mark === "check" ? "✓" : a.mark === "arrow" ? "→" : "•"}
                </span>
                <div className="pb-dash-anno-text">
                  <span className="pb-dash-anno-kicker">{a.kicker}</span>
                  <span className="pb-dash-anno-title">{a.title}</span>
                  <span className="pb-dash-anno-meta">{a.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
