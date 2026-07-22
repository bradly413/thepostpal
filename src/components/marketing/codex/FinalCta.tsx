"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { DEMO_CATEGORIES } from "@/components/marketing/codex/demo-feed";
import { goToDemo, DEMO_SUBMIT, PRIMARY_CTA } from "@/lib/marketing/demo-intake";
import { track } from "@/lib/marketing/track";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

/** Final dark CTA — demo intake + free trial. */
export default function FinalCta() {
  const [categoryId, setCategoryId] = useState(DEMO_CATEGORIES[1]?.id ?? DEMO_CATEGORIES[0].id);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    track("hero_demo_started", { location: "final_cta", category: categoryId });
    goToDemo({ category: categoryId, autoStart: true });
  };

  return (
    <section className="pbv-fcta" aria-labelledby="pbv-fcta-title">
      <div className="pbv-fcta-card">
        <p className="pbv-fcta-kicker">Start with proof.</p>
        <h2 id="pbv-fcta-title">Create it. Caption it. Schedule it out.</h2>
        <p className="pbv-fcta-sub">
          See auto captions in your voice, then fill the calendar as far ahead as you want —
          month out or further.
        </p>
        <form className="pbv-fcta-form" onSubmit={onSubmit}>
          <label className="pbv-fcta-label" htmlFor="pbv-fcta-cat">
            I run a
          </label>
          <select
            id="pbv-fcta-cat"
            className="pbv-fcta-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {DEMO_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <button type="submit" className="pbv-fcta-btn">
            {DEMO_SUBMIT}
          </button>
        </form>
        <p className="pbv-fcta-terms">Live demo captions. Nothing publishes without approval.</p>
        <p className="pbv-fcta-alt">
          Ready to go?{" "}
          <Link
            href={SIGNUP_ONBOARDING_URL}
            onClick={() => track("start_trial_clicked", { location: "final_cta" })}
          >
            Start free trial
          </Link>
          {" · "}
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              track("hero_demo_started", { location: "final_cta_link" });
              goToDemo();
            }}
          >
            {PRIMARY_CTA}
          </a>
        </p>
      </div>

      <style>{`
        .pbv-fcta {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(56px, 9vh, 110px) clamp(20px, 3vw, 48px) clamp(28px, 4vh, 48px);
          max-width: 1080px;
          margin: 0 auto;
        }
        .pbv-fcta-card {
          background: var(--ink);
          border-radius: 28px;
          padding: clamp(36px, 5vw, 72px);
          text-align: center;
        }
        .pbv-fcta-kicker {
          margin: 0 0 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }
        .pbv-fcta h2 {
          margin: 0 auto 14px;
          font-size: clamp(28px, 3.8vw, 48px);
          font-weight: 750;
          letter-spacing: -0.03em;
          line-height: 1.06;
          color: #fff;
          max-width: 16ch;
        }
        .pbv-fcta-sub {
          margin: 0 auto 28px;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.68);
          max-width: 48ch;
        }
        .pbv-fcta-form {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pbv-fcta-label {
          font-size: 15px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.75);
        }
        .pbv-fcta-select {
          appearance: none;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          color: #fff;
          font-size: 15px;
          font-weight: 650;
          padding: 0 18px;
          min-height: 48px;
          min-width: min(100%, 220px);
        }
        .pbv-fcta-select:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
        .pbv-fcta-select option { color: #141418; }
        .pbv-fcta-btn {
          background: var(--red); color: #fff;
          border: 0;
          border-radius: 999px;
          padding: 0 28px; min-height: 48px;
          display: inline-flex; align-items: center;
          font-size: 15.5px; font-weight: 750;
          cursor: pointer;
          transition: background 0.25s ease, transform 0.15s ease;
        }
        .pbv-fcta-btn:hover { background: #c81e2a; }
        .pbv-fcta-btn:active { transform: scale(0.98); }
        .pbv-fcta-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .pbv-fcta-terms {
          margin: 18px 0 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }
        .pbv-fcta-alt {
          margin: 22px 0 0;
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .pbv-fcta-alt a { color: rgba(255, 255, 255, 0.88); }
      `}</style>
    </section>
  );
}
