"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

/**
 * DATA HONESTY: Posterboy has no published customer case studies yet. Every
 * scenario below is an ILLUSTRATIVE example — flagged in data and labeled
 * visibly in the UI, tied to no named customer. Replace with real, permitted
 * case studies when they exist.
 */
interface CaseStudy {
  id: string;
  tab: string;
  scenario: string;
  before: string;
  workflow: string;
  after: string;
  features: string[];
  charts: {
    posting: { before: number; after: number; unit: string };
    engagement: { before: number; after: number; unit: string };
  };
  isPlaceholder: true;
  verified: false;
}

const CASES: CaseStudy[] = [
  {
    id: "cafe",
    tab: "Corner café",
    scenario:
      "A two-owner café where social lived on whoever had a free hand — usually at 11pm on Sunday.",
    before: "One post most weeks. Sometimes none. Captions written in the walk-in.",
    workflow:
      "Voice set once from the menu and a few old posts. Each week: type what's happening, approve three drafts, done before the Monday delivery.",
    after: "A steady four posts a week that sound like the owners, not a scheduler.",
    features: ["Brand voice", "Studio images", "Weekly drafts", "Approve from your phone"],
    charts: {
      posting: { before: 1, after: 4, unit: "posts/week" },
      engagement: { before: 100, after: 180, unit: "index" },
    },
    isPlaceholder: true,
    verified: false,
  },
  {
    id: "realestate",
    tab: "Real estate team",
    scenario:
      "A three-agent team with listings to move and zero appetite for content planning meetings.",
    before: "Posts clustered around listings, then silence between closings.",
    workflow:
      "Listing notes go in as plain sentences. Posterboy drafts the open-house push, the sold post, and the in-between weeks that keep the feed warm.",
    after: "Five posts a week across the team, one voice, no gaps between listings.",
    features: ["Multi-profile scheduling", "Brand voice", "Calendar view"],
    charts: {
      posting: { before: 2, after: 5, unit: "posts/week" },
      engagement: { before: 100, after: 160, unit: "index" },
    },
    isPlaceholder: true,
    verified: false,
  },
  {
    id: "salon",
    tab: "Salon studio",
    scenario:
      "A booked-solid salon where the chair time is full but the feed looked abandoned.",
    before: "A flurry of posts after a slow week, then nothing for a month.",
    workflow:
      "Openings, seasonal treatments, and rebooking reminders drafted weekly; the owner approves between clients.",
    after: "Three consistent posts a week and a feed that matches how busy the room actually is.",
    features: ["Weekly drafts", "Studio images", "Approve from your phone"],
    charts: {
      posting: { before: 1, after: 3, unit: "posts/week" },
      engagement: { before: 100, after: 170, unit: "index" },
    },
    isPlaceholder: true,
    verified: false,
  },
];

/** Accessible before/after bar pair — semantic HTML + SVG, values visible. */
function MiniChart({
  title,
  before,
  after,
  unit,
}: {
  title: string;
  before: number;
  after: number;
  unit: string;
}) {
  const max = Math.max(before, after) * 1.15;
  const h = 96;
  const bh = Math.max(6, (before / max) * h);
  const ah = Math.max(6, (after / max) * h);
  return (
    <figure className="pbx-cs-chart">
      <figcaption>{title}</figcaption>
      <div
        className="pbx-cs-chart-body"
        role="img"
        aria-label={`${title}: before ${before} ${unit}, after ${after} ${unit}`}
      >
        <svg viewBox={`0 0 120 ${h + 4}`} width="120" height={h + 4} aria-hidden focusable="false">
          <rect
            className="pbx-cs-bar pbx-cs-bar--before"
            x="14"
            y={h + 2 - bh}
            width="34"
            height={bh}
            rx="5"
          />
          <rect
            className="pbx-cs-bar pbx-cs-bar--after"
            x="70"
            y={h + 2 - ah}
            width="34"
            height={ah}
            rx="5"
          />
        </svg>
        <div className="pbx-cs-chart-labels" aria-hidden>
          <span>
            <strong>{before}</strong> before
          </span>
          <span>
            <strong>{after}</strong> after
          </span>
        </div>
      </div>
    </figure>
  );
}

/** Tabbed illustrative case studies: before → workflow → after, with charts. */
export default function CaseStudies() {
  const rootRef = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const [active, setActive] = useState(0);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll<HTMLElement>(".pbx-cs-head, .pbx-cs-tabs, .pbx-cs-panelwrap");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        bits,
        { autoAlpha: 0, y: 26 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: root,
            start: "top 74%",
            end: "bottom 10%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  // Short panel transition on tab change (no scrub, no re-trigger).
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reducedMotion) return;
      const panel = root.querySelector(".pbx-cs-panel");
      if (!panel) return;
      gsap.fromTo(panel, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" });
      const bars = panel.querySelectorAll(".pbx-cs-bar");
      gsap.fromTo(
        bars,
        { scaleY: 0, transformOrigin: "center bottom" },
        { scaleY: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
      );
    },
    { scope: rootRef, dependencies: [active, reducedMotion] },
  );

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (active + 1) % CASES.length
        : (active - 1 + CASES.length) % CASES.length;
    setActive(next);
    track("case_study_tab_selected", { tab: CASES[next].id });
    const btn = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    btn?.focus();
  };

  const cs = CASES[active];

  return (
    <section className="pbx-cs" id="results" aria-labelledby="pbx-cs-title" ref={rootRef}>
      <div className="pbx-cs-head">
        <p className="pbx-cs-kicker">What changes</p>
        <h2 id="pbx-cs-title">We checked the numbers so you don&rsquo;t have to.</h2>
        <p className="pbx-cs-disclaimer">
          Illustrative examples — how a consistent Posterboy week could look. Not reported customer
          performance.
        </p>
      </div>

      <div className="pbx-cs-tabs" role="tablist" aria-label="Example business types">
        {CASES.map((c, i) => (
          <button
            key={c.id}
            role="tab"
            id={`${baseId}-tab-${c.id}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${c.id}`}
            tabIndex={i === active ? 0 : -1}
            className={`pbx-cs-tab${i === active ? " is-active" : ""}`}
            onClick={() => {
              setActive(i);
              track("case_study_tab_selected", { tab: c.id });
            }}
            onKeyDown={onTabKey}
          >
            {c.tab}
          </button>
        ))}
      </div>

      <div className="pbx-cs-panelwrap">
        <div
          className="pbx-cs-panel"
          role="tabpanel"
          id={`${baseId}-panel-${cs.id}`}
          aria-labelledby={`${baseId}-tab-${cs.id}`}
        >
          <div className="pbx-cs-story">
            <span className="pbx-cs-flag">Illustrative example</span>
            <p className="pbx-cs-scenario">{cs.scenario}</p>
            <dl className="pbx-cs-steps">
              <div>
                <dt>Before</dt>
                <dd>{cs.before}</dd>
              </div>
              <div>
                <dt>With Posterboy</dt>
                <dd>{cs.workflow}</dd>
              </div>
              <div>
                <dt>After</dt>
                <dd>{cs.after}</dd>
              </div>
            </dl>
            <ul className="pbx-cs-features" aria-label="Product features used">
              {cs.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="pbx-cs-side">
            <MiniChart
              title="Posting frequency"
              before={cs.charts.posting.before}
              after={cs.charts.posting.after}
              unit={cs.charts.posting.unit}
            />
            <MiniChart
              title="Engagement (indexed)"
              before={cs.charts.engagement.before}
              after={cs.charts.engagement.after}
              unit={cs.charts.engagement.unit}
            />
            <p className="pbx-cs-chart-note">
              Example values for illustration — not measured results.
            </p>
            <Link
              href={SIGNUP_ONBOARDING_URL}
              className="pbx-cs-cta"
              onClick={() => track("start_trial_clicked", { location: "case_studies" })}
            >
              Start free trial
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .pbx-cs {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(72px, 11vh, 140px) clamp(20px, 3vw, 48px);
          max-width: 1080px;
          margin: 0 auto;
        }
        .pbx-cs-kicker {
          margin: 0 0 14px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-cs h2 {
          margin: 0;
          font-size: clamp(28px, 3.6vw, 44px);
          font-weight: 700; letter-spacing: -0.025em; line-height: 1.08;
          color: var(--ink);
          max-width: 22ch;
        }
        .pbx-cs-disclaimer {
          margin: 14px 0 0;
          font-size: 13px; font-weight: 600;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
          max-width: 60ch;
        }
        .pbx-cs-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 30px 0 18px; }
        .pbx-cs-tab {
          border: 1px solid rgba(20,20,24,0.16);
          background: rgba(255,255,255,0.7);
          color: color-mix(in srgb, var(--ink) 72%, transparent);
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          min-height: 42px;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .pbx-cs-tab:hover { border-color: color-mix(in srgb, var(--ink) 40%, transparent); color: var(--ink); }
        .pbx-cs-tab.is-active { background: var(--ink); border-color: var(--ink); color: #fff; }
        .pbx-cs-tab:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .pbx-cs-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.6fr) minmax(0, 0.4fr);
          gap: clamp(22px, 3vw, 44px);
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(20,20,24,0.08);
          border-radius: 20px;
          padding: clamp(20px, 3vw, 36px);
          box-shadow: 0 26px 60px -36px rgba(20,25,40,0.4);
        }
        .pbx-cs-flag {
          display: inline-block;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--red);
          border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
          border-radius: 999px;
          padding: 4px 10px;
          margin-bottom: 14px;
        }
        .pbx-cs-scenario { margin: 0 0 18px; font-size: clamp(16px, 1.4vw, 19px); line-height: 1.5; font-weight: 600; color: var(--ink); }
        .pbx-cs-steps { margin: 0; display: flex; flex-direction: column; gap: 13px; }
        .pbx-cs-steps dt {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
          margin-bottom: 3px;
        }
        .pbx-cs-steps dd { margin: 0; font-size: 14.5px; line-height: 1.55; color: color-mix(in srgb, var(--ink) 72%, transparent); }
        .pbx-cs-features { list-style: none; margin: 18px 0 0; padding: 0; display: flex; gap: 7px; flex-wrap: wrap; }
        .pbx-cs-features li {
          font-size: 12px; font-weight: 600;
          border: 1px solid rgba(20,20,24,0.12);
          border-radius: 999px; padding: 5px 11px;
          color: color-mix(in srgb, var(--ink) 60%, transparent);
        }
        .pbx-cs-side { display: flex; flex-direction: column; gap: 16px; }
        .pbx-cs-chart { margin: 0; }
        .pbx-cs-chart figcaption {
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 55%, transparent);
          margin-bottom: 6px;
        }
        .pbx-cs-chart-body { display: flex; align-items: flex-end; gap: 14px; }
        .pbx-cs-bar--before { fill: color-mix(in srgb, #141418 22%, transparent); }
        .pbx-cs-bar--after { fill: var(--red); }
        .pbx-cs-chart-labels { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: color-mix(in srgb, var(--ink) 60%, transparent); }
        .pbx-cs-chart-labels strong { color: var(--ink); font-variant-numeric: tabular-nums; }
        .pbx-cs-chart-note { margin: 0; font-size: 11.5px; color: color-mix(in srgb, var(--ink) 45%, transparent); }
        .pbx-cs-cta {
          align-self: flex-start;
          background: var(--red); color: #fff;
          border-radius: 12px; padding: 12px 20px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          transition: background 0.25s ease;
          min-height: 44px; display: inline-flex; align-items: center;
        }
        .pbx-cs-cta:hover { background: #c81e2a; }
        .pbx-cs-cta:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        @media (max-width: 760px) {
          .pbx-cs-panel { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
