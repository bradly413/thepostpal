"use client";

import { useRef, useState } from "react";
import PromptRewriteDemo from "@/components/onboarding/PromptRewriteDemo";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// "The Agency Moat" — the Features section. Repositions Posterboy from a
// scheduler to an enterprise-grade, compliance-guardrailed creative engine.
// Block 2 (Ironclad Compliance) is built first; blocks 1, 3, 4 follow.

// Industries shown in the writing demo — the pill switcher picks one and the
// PromptRewriteDemo plays a rough note -> Posterboy rewrite for that business.
interface IndustryCase {
  key: string;
  pill: string;
  businessType: string;
}

const CASES: IndustryCase[] = [
  { key: "beauty", pill: "Skincare", businessType: "beauty" },
  { key: "real-estate", pill: "Real estate", businessType: "real-estate" },
  { key: "hospitality", pill: "Café", businessType: "hospitality" },
  { key: "fitness", pill: "Fitness", businessType: "fitness" },
];

export default function AgencyMoat() {
  const sectionRef = useRef<HTMLElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();
  const [active, setActive] = useState(0);
  const c = CASES[active];

  useGSAP(
    () => {
      if (!ready) return;
      const section = sectionRef.current;
      if (!section) return;

      const head = section.querySelector<HTMLElement>(".am-head");
      const block = section.querySelector<HTMLElement>(".am-block");
      const targets = [head, block].filter(Boolean) as HTMLElement[];

      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      targets.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
            delay: i * 0.05,
          },
        );
      });
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section ref={sectionRef} id="features" className="am">
      <div className="am-head">
        <span className="section-num am-num">Built for busy owners</span>
        <h2 className="type-display am-title">
          You run the business.
          <br />
          <span className="am-title-accent">Posterboy runs the posts.</span>
        </h2>
        <p className="am-lede">
          Tell Posterboy what&apos;s going on this week. It writes your posts in your voice,
          fills your calendar, and quietly keeps you out of trouble — all before you tap publish.
        </p>
      </div>

      <div className="am-block">
        <div className="am-copy">
          <span className="am-eyebrow">In your words</span>
          <h3 className="am-h">Don&apos;t know what to say? Posterboy does.</h3>
          <p className="am-body">
            Jot a rough note — a weekend sale, an open house, a new class. Posterboy turns it
            into a finished post in your voice, shaped to your kind of business. No blank
            caption, no second-guessing — just something ready to publish.
          </p>
          <ul className="am-points">
            <li>Writes in your brand voice</li>
            <li>Tuned to your kind of business</li>
            <li>Ready to post in one tap</li>
          </ul>
        </div>

        <div className="am-mock" aria-label="Posterboy writing preview">
          <PromptRewriteDemo businessType={c.businessType} key={c.key} />

          <div className="am-pills" role="tablist" aria-label="Industry">
            {CASES.map((cc, i) => (
              <button
                key={cc.key}
                type="button"
                role="tab"
                aria-selected={i === active}
                className={`am-pill${i === active ? " is-on" : ""}`}
                onClick={() => setActive(i)}
              >
                {cc.pill}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .pb-marketing-site .am {
          --pb-red: #ee2532;
          position: relative;
          padding: clamp(72px, 12vh, 140px) var(--px);
          background: var(--paper);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pb-marketing-site .am-head {
          max-width: 760px;
          text-align: center;
          margin-bottom: clamp(40px, 6vh, 72px);
        }
        .pb-marketing-site .am-num { color: var(--pb-red); }
        .pb-marketing-site .am-title {
          margin: 0.6em 0 0;
          font-size: clamp(30px, 5vw, 58px);
          line-height: 1.04;
          letter-spacing: -0.025em;
        }
        .pb-marketing-site .am-title-accent { color: var(--pb-red); }
        .pb-marketing-site .am-lede {
          margin: 1.1em auto 0;
          max-width: 56ch;
          font-size: clamp(15px, 1.1vw, 18px);
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 64%, transparent);
        }
        .pb-marketing-site .am-block {
          width: 100%;
          max-width: 1080px;
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
          gap: clamp(28px, 4vw, 64px);
          align-items: center;
        }
        @media (max-width: 880px) {
          .pb-marketing-site .am-block { grid-template-columns: 1fr; }
        }
        .pb-marketing-site .am-eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--pb-red);
          font-weight: 600;
        }
        .pb-marketing-site .am-h {
          margin: 0.6em 0 0;
          font-family: var(--font-serif);
          font-size: clamp(24px, 2.8vw, 36px);
          font-weight: 500;
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: var(--ink);
        }
        .pb-marketing-site .am-body {
          margin: 0.9em 0 0;
          font-size: 15px;
          line-height: 1.65;
          color: color-mix(in srgb, var(--ink) 66%, transparent);
        }
        .pb-marketing-site .am-points {
          margin: 1.2em 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pb-marketing-site .am-points li {
          position: relative;
          padding-left: 22px;
          font-size: 14px;
          color: color-mix(in srgb, var(--ink) 72%, transparent);
        }
        .pb-marketing-site .am-points li::before {
          content: "";
          position: absolute;
          left: 4px;
          top: 0.55em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--pb-red);
        }

        .pb-marketing-site .am-card {
          background: var(--white);
          border: 1px solid var(--newsprint);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 24px 56px -34px rgba(15,15,20,0.3), 0 6px 16px -12px rgba(15,15,20,0.12);
        }
        .pb-marketing-site .am-card-head {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--newsprint);
        }
        .pb-marketing-site .am-av {
          flex: none;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--pb-red);
          color: var(--paper);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .pb-marketing-site .am-card-id { display: flex; flex-direction: column; line-height: 1.25; }
        .pb-marketing-site .am-brand { font-size: 14px; font-weight: 600; color: var(--ink); }
        .pb-marketing-site .am-vert { font-size: 11.5px; color: var(--quiet-sage); }
        .pb-marketing-site .am-chan {
          margin-left: auto;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--quiet-sage);
        }
        .pb-marketing-site .am-draft {
          margin: 0;
          padding: 18px 16px;
          font-size: 16px;
          line-height: 1.75;
          color: var(--ink);
          min-height: 88px;
        }
        .pb-marketing-site .am-flag {
          border-radius: 3px;
          padding: 0 2px;
          text-decoration: underline wavy;
          text-underline-offset: 3px;
          cursor: help;
        }
        .pb-marketing-site .am-flag--block {
          background: rgba(196,30,42,0.10);
          color: #c41e2a;
          text-decoration-color: #c41e2a;
        }
        .pb-marketing-site .am-flag--warn {
          background: rgba(154,107,18,0.12);
          color: #9a6b12;
          text-decoration-color: #9a6b12;
        }
        .pb-marketing-site .am-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 12px 16px;
          border-top: 1px solid var(--newsprint);
          background: color-mix(in srgb, var(--paper) 60%, var(--white));
        }
        .pb-marketing-site .am-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid;
        }
        .pb-marketing-site .am-badge--block {
          background: rgba(196,30,42,0.12);
          color: #c41e2a;
          border-color: rgba(196,30,42,0.35);
        }
        .pb-marketing-site .am-badge--warn {
          background: rgba(200,140,40,0.12);
          color: #9a6b12;
          border-color: rgba(200,140,40,0.35);
        }
        .pb-marketing-site .am-spark { flex: none; display: inline-flex; color: var(--pb-red); }
        .pb-marketing-site .am-msg { font-size: 13px; color: var(--ink); flex: 1; min-width: 150px; }
        .pb-marketing-site .am-fix {
          display: flex;
          gap: 9px;
          padding: 13px 16px;
          border-top: 1px solid var(--newsprint);
          font-size: 13.5px;
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 70%, transparent);
        }
        .pb-marketing-site .am-fix-spark {
          flex: none;
          display: inline-flex;
          margin-top: 1px;
          color: var(--pb-red);
        }
        .pb-marketing-site .am-fix-label { font-weight: 600; color: var(--pb-red); }
        .pb-marketing-site .am-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }
        .pb-marketing-site .am-pill {
          font-size: 13px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--newsprint);
          background: transparent;
          color: var(--quiet-sage);
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
        }
        .pb-marketing-site .am-pill:hover { border-color: color-mix(in srgb, var(--pb-red) 45%, var(--newsprint)); color: var(--ink); }
        .pb-marketing-site .am-pill.is-on {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--paper);
        }
      `}</style>
    </section>
  );
}
