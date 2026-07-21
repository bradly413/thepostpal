"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFeedDemo } from "@/components/marketing/codex/useFeedDemo";
import { DEMO_CATEGORIES } from "@/components/marketing/codex/demo-feed";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";

/**
 * Compact reprise of the hero demo for visitors who made it to the bottom.
 * Shares the hero's data model and hook; shows ONE post preview, then routes
 * to the trial (or back up to the full demo). No second heavy generator.
 */
export default function FooterCta() {
  const { status, result, submit, retry } = useFeedDemo("footer");
  const [categoryId, setCategoryId] = useState(DEMO_CATEGORIES[0].id);
  const [businessName, setBusinessName] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "writing") return;
    if (status === "done") {
      retry();
      return;
    }
    void submit(categoryId, businessName);
  };

  const post = result?.posts[0];

  return (
    <section className="pbx-fcta" aria-labelledby="pbx-fcta-title">
      <div className="pbx-fcta-card">
        <h2 id="pbx-fcta-title">Still scrolling? Show us your business.</h2>

        {status !== "done" ? (
          <form className="pbx-fcta-form" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="pbx-fcta-cat">
              What kind of business do you run?
            </label>
            <select
              id="pbx-fcta-cat"
              className="pbx-fcta-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                track("category_selected", { category: e.target.value, location: "footer" });
              }}
              disabled={status === "writing"}
            >
              {DEMO_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="pbx-fcta-name">
              Business name (optional)
            </label>
            <input
              id="pbx-fcta-name"
              className="pbx-fcta-input"
              type="text"
              value={businessName}
              maxLength={60}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name (optional)"
              disabled={status === "writing"}
            />
            <button
              type="submit"
              className="pbx-fcta-btn"
              disabled={status === "writing"}
              aria-busy={status === "writing"}
            >
              {status === "writing" ? "Writing your posts..." : "Show me my feed"}
            </button>
          </form>
        ) : (
          <div className="pbx-fcta-result" aria-live="polite">
            {post ? (
              <article className="pbx-fcta-post">
                <Image
                  src={result.category.resultImage.src}
                  alt={result.category.resultImage.alt}
                  width={72}
                  height={90}
                  className="pbx-fcta-post-img"
                />
                <div>
                  <span className="pbx-fcta-when">
                    {post.day} · {post.time}
                  </span>
                  <p className="pbx-fcta-copy">{post.copy}</p>
                  {result.usedFallback ? (
                    <p className="pbx-fcta-note">Example post — drafted earlier with this engine.</p>
                  ) : null}
                </div>
              </article>
            ) : null}
            <div className="pbx-fcta-actions">
              <Link
                href={SIGNUP_ONBOARDING_URL}
                className="pbx-fcta-btn"
                onClick={() => track("start_trial_clicked", { location: "footer_result" })}
              >
                Start free trial
              </Link>
              <a href="#demo" className="pbx-fcta-more">
                See the full week up top
              </a>
              <button type="button" className="pbx-fcta-more" onClick={() => retry()}>
                Try another business type.
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pbx-fcta {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(56px, 9vh, 110px) clamp(20px, 3vw, 48px) clamp(28px, 4vh, 48px);
          max-width: 880px;
          margin: 0 auto;
        }
        .pbx-fcta-card {
          background: var(--ink);
          border-radius: 24px;
          padding: clamp(26px, 4vw, 48px);
          box-shadow: 0 34px 80px -40px rgba(20,20,30,0.6);
        }
        .pbx-fcta h2 {
          margin: 0 0 22px;
          font-size: clamp(24px, 3vw, 36px);
          font-weight: 700; letter-spacing: -0.02em; line-height: 1.1;
          color: #fff;
        }
        .pbx-fcta-form { display: flex; gap: 10px; flex-wrap: wrap; }
        .pbx-fcta-select, .pbx-fcta-input {
          flex: 1 1 180px;
          min-height: 48px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: rgba(255,255,255,0.08);
          color: #fff;
          padding: 0 14px;
          font-size: 14.5px;
        }
        .pbx-fcta-select option { color: #141418; }
        .pbx-fcta-input::placeholder { color: rgba(255,255,255,0.5); }
        .pbx-fcta-select:focus-visible, .pbx-fcta-input:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .pbx-fcta-btn {
          border: 0;
          background: var(--red); color: #fff;
          border-radius: 12px;
          padding: 0 22px;
          min-height: 48px;
          font-size: 14.5px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center;
          transition: background 0.25s ease;
        }
        .pbx-fcta-btn:hover { background: #c81e2a; }
        .pbx-fcta-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .pbx-fcta-btn[aria-busy="true"] { opacity: 0.85; cursor: progress; }
        .pbx-fcta-result { display: flex; flex-direction: column; gap: 18px; }
        .pbx-fcta-post {
          display: flex; gap: 14px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 14px;
        }
        .pbx-fcta-post-img { border-radius: 9px; object-fit: cover; flex: none; }
        .pbx-fcta-when {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-fcta-copy { margin: 5px 0 0; font-size: 14.5px; line-height: 1.5; color: #fff; }
        .pbx-fcta-note { margin: 7px 0 0; font-size: 12px; color: rgba(255,255,255,0.55); }
        .pbx-fcta-actions { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .pbx-fcta-more {
          background: none; border: 0; padding: 0; cursor: pointer;
          font-size: 13.5px; font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-decoration: underline; text-underline-offset: 3px;
        }
        .pbx-fcta-more:hover { color: #fff; }
        .pbx-fcta-more:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
      `}</style>
    </section>
  );
}
