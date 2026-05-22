"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useScrollEngine, SPINE_VH } from "./useScrollEngine";
import ChapterNav from "./ChapterNav";
import ScrollBar from "./ScrollBar";
import InkwellCursor from "./InkwellCursor";
import GradientLayer from "./GradientLayer";
import SplitHeadline from "./SplitHeadline";
import ToneRing from "./ToneRing";
import ContactPanel from "./ContactPanel";
import { chapterOpacity, INDUSTRY_LINES, WORKFLOW_STEPS } from "@/lib/experience/chapters";
import { CORE, GROWTH, PRODUCT } from "@/lib/posterboy-copy";
import { getPublicTiers } from "@/lib/pricing";

const DraftRingCanvas = dynamic(() => import("./DraftRingCanvas"), { ssr: false });

export default function PosterboyExperience() {
  const { progress, chapter, spineRef, stickyRef } = useScrollEngine();
  const [headline, setHeadline] = useState<string>(CORE.tagline);
  const [hint, setHint] = useState("Scroll to explore");

  useEffect(() => {
    function setVh() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      document.documentElement.style.setProperty("--svh", `${vh}px`);
    }
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  useEffect(() => {
    if (progress < 0.05) setHint("Scroll to explore");
    else if (progress > 0.95) setHint("");
    else setHint("Keep scrolling");
  }, [progress]);

  const showCanvas = chapter >= 1 && chapter <= 4;
  const showContact = progress > 0.82;
  const darkNav = chapter >= 6;

  const tiers = getPublicTiers();

  return (
    <div className="pb-xp">
      <InkwellCursor />
      <ChapterNav activeIndex={chapter} dark={darkNav} />
      <ScrollBar progress={progress} />
      {hint && <p className="pb-xp-bottom-hint">{hint}</p>}

      <div ref={spineRef} className="pb-xp-spine" style={{ height: `${SPINE_VH}vh` }}>
        <div ref={stickyRef} className="pb-xp-sticky">
          <GradientLayer progress={progress} />
          <DraftRingCanvas progress={progress} visible={showCanvas} />

          {/* Chapter 0 — Intro */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 0) }}>
            <div className="pb-xp-intro">
              <SplitHeadline text={headline} />
              <p className="pb-xp-sub">{CORE.subtitle}</p>
              <ToneRing onToneChange={setHeadline} disabled={chapter !== 0} />
            </div>
          </div>

          {/* Chapter 1 — Product */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 1) }}>
            <div className="pb-xp-center-copy">
              <p className="pb-xp-eyebrow">PRODUCT</p>
              <h2 className="pb-xp-section-title">{CORE.weekDrafted}</h2>
              <p className="pb-xp-body">Five posts. Three captions. One photo of the dog. Approve in two taps.</p>
            </div>
          </div>

          {/* Chapter 2 — Workflow */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 2) }}>
            <div className="pb-xp-workflow">
              <p className="pb-xp-eyebrow">WORKFLOW</p>
              <h2 className="pb-xp-section-title">Draft. Edit. Press. Dispatch.</h2>
              <div className="pb-xp-workflow-steps">
                {WORKFLOW_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className="pb-xp-workflow-step"
                    style={{
                      opacity: progress > 2 / 7 + (i / WORKFLOW_STEPS.length) * (1 / 7) ? 1 : 0.25,
                      transform: `translateY(${Math.max(0, 40 - (progress - 2 / 7) * 400 - i * 8)}px)`,
                    }}
                  >
                    <span className="pb-xp-step-num">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chapter 3 — Industries */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 3) }}>
            <div className="pb-xp-industries">
              <p className="pb-xp-eyebrow">INDUSTRIES</p>
              <h2 className="pb-xp-section-title">{CORE.builtFor}</h2>
              <div className="pb-xp-industry-list">
                {INDUSTRY_LINES.map((item, i) => (
                  <article
                    key={item.title}
                    className={`pb-xp-industry-item ${i === Math.floor((progress * 7 - 3) * 2) % INDUSTRY_LINES.length ? "active" : ""}`}
                  >
                    <h3>{item.title}</h3>
                    <p>{item.line}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* Chapter 4 — Drafts */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 4) }}>
            <div className="pb-xp-center-copy">
              <p className="pb-xp-eyebrow">{PRODUCT.drafts}</p>
              <h2 className="pb-xp-section-title">{GROWTH.problemHeadline}</h2>
              <p className="pb-xp-body">{GROWTH.unlikeCompetitors}</p>
            </div>
          </div>

          {/* Chapter 5 — Pricing */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 5) }}>
            <div className="pb-xp-pricing">
              <p className="pb-xp-eyebrow">PRICING</p>
              <div className="pb-xp-pricing-row">
                {tiers.map((t) => (
                  <Link key={t.id} href={t.ctaHref} className="pb-xp-price-card">
                    <p className="pb-xp-price-name">{t.name}</p>
                    <p className="pb-xp-price-amt">{t.price}<span>/mo</span></p>
                    <p className="pb-xp-price-desc">{t.description}</p>
                  </Link>
                ))}
              </div>
              <Link href="/pricing" className="pb-xp-link-all">All plans</Link>
            </div>
          </div>

          {/* Chapter 6 — Contact placeholder (form is fixed overlay) */}
          <div className="pb-xp-panel" style={{ opacity: chapterOpacity(progress, 6) }}>
            <div className="pb-xp-center-copy pb-xp-center-copy--dark">
              <p className="pb-xp-eyebrow">CONTACT</p>
              <h2 className="pb-xp-section-title">{CORE.weekDrafted}</h2>
              <p className="pb-xp-body">{CORE.approveLeisure}</p>
            </div>
          </div>

          <ContactPanel visible={showContact} />

          <footer className="pb-xp-footer">
            <span className="pb-xp-footer-logo">posterboy</span>
            <div className="pb-xp-footer-links">
              <Link href="/pricing">Pricing</Link>
              <Link href="/sign-in">Sign in</Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
