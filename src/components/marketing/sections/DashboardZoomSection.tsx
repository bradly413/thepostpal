"use client";

import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

const DASHBOARD_SRC = "/images/posterboy-dashboard-zoom.png";
const DASHBOARD_SRC_2X = "/images/posterboy-dashboard-zoom@2x.png";
const DASHBOARD_WIDTH = 2048;
const DASHBOARD_HEIGHT = 1258;

const KICKER = "Inside the workspace";
const HEADLINE = "Your whole week, handled in one calm screen.";
const LEDE =
  "No newsfeed to fight. No bloated business suite to learn. Posterboy drafts in your voice, fills your calendar a week ahead, and publishes while you're busy running the place.";

const STATS: { value: string; label: string }[] = [
  { value: "3", label: "drafts in your voice" },
  { value: "1 week", label: "scheduled ahead" },
  { value: "0", label: "newsfeed required" },
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
    kicker: "Posted",
    title: "While you were closed",
    meta: "Instagram · Facebook",
    mark: "arrow",
  },
  {
    className: "pb-dash-anno pb-dash-anno--bl",
    kicker: "Brand voice",
    title: "Warm. Local. Considered.",
    meta: "Learned from your posts",
    mark: "dot",
  },
];

/**
 * Living workspace — editorial copy on the left, dashboard mockup on the right
 * at modest scale, with a few quiet ambient annotations layered around it.
 *
 * Motion is handled by the shared site-wide reveal system: elements carry a
 * `data-reveal` attribute and rise into view via setupRevealBatch(), so this
 * section speaks the same motion vocabulary as the rest of the page.
 */
export default function DashboardZoomSection() {
  return (
    <section
      id="product"
      className="pb-dash-zoom"
      aria-label="Inside Posterboy — a calm workspace for social posts"
    >
      <div className="pb-dash-zoom-stage">
        <div className="pb-dash-zoom-copy">
          <p className="pb-dash-zoom-kicker" data-reveal="up-sm">{KICKER}</p>
          <h2 className="pb-dash-zoom-headline type-display" data-reveal>{HEADLINE}</h2>
          <p className="pb-dash-zoom-lede" data-reveal>{LEDE}</p>
          <dl className="pb-dash-zoom-stats" aria-label="Your week at a glance">
            {STATS.map((s) => (
              <div key={s.label} className="pb-dash-zoom-stat" data-reveal="up-sm">
                <dt className="pb-dash-zoom-stat-value">{s.value}</dt>
                <dd className="pb-dash-zoom-stat-label">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="pb-dash-zoom-canvas">
          <div className="pb-ipad-device" data-reveal="up-lg">
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
              <div key={a.kicker + a.title} className={a.className} aria-hidden data-reveal="up-sm">
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
