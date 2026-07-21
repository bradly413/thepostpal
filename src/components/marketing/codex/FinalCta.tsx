"use client";

import Link from "next/link";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";

/** Final CTA band — the promise, restated once, with one red action. */
export default function FinalCta() {
  const { scrollToAnchor } = useMarketingScroll();

  return (
    <section className="pbv-fcta" aria-labelledby="pbv-fcta-title">
      <div className="pbv-fcta-card">
        <h2 id="pbv-fcta-title">Your next week of posts can already be waiting.</h2>
        <p className="pbv-fcta-sub">
          Set the voice, give Posterboy the business updates, and review what it makes.
        </p>
        <div className="pbv-fcta-ctas">
          <Link
            href={SIGNUP_ONBOARDING_URL}
            className="pbv-fcta-btn"
            onClick={() => track("start_trial_clicked", { location: "final_cta" })}
          >
            Start free trial
          </Link>
          <a
            href="#demo"
            className="pbv-fcta-link"
            onClick={(e) => {
              e.preventDefault();
              scrollToAnchor("#demo");
            }}
          >
            See Posterboy work
          </a>
        </div>
        <p className="pbv-fcta-alt">
          Managing multiple locations? <Link href="/pricing">Explore Command</Link>.
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
        .pbv-fcta h2 {
          margin: 0 auto 14px;
          font-size: clamp(28px, 3.8vw, 48px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.06;
          color: #fff;
          max-width: 20ch;
        }
        .pbv-fcta-sub {
          margin: 0 auto 30px;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.68);
          max-width: 46ch;
        }
        .pbv-fcta-ctas {
          display: flex; align-items: center; justify-content: center;
          gap: 24px; flex-wrap: wrap;
        }
        .pbv-fcta-btn {
          background: var(--red); color: #fff;
          border-radius: 999px;
          padding: 0 30px; min-height: 54px;
          display: inline-flex; align-items: center;
          font-size: 16px; font-weight: 700;
          text-decoration: none;
          transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s ease;
        }
        .pbv-fcta-btn:hover { background: #c81e2a; }
        .pbv-fcta-btn:active { transform: scale(0.98); }
        .pbv-fcta-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .pbv-fcta-link {
          color: rgba(255, 255, 255, 0.85);
          font-size: 15px; font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 5px;
          text-decoration-color: rgba(255, 255, 255, 0.35);
          transition: text-decoration-color 0.25s ease;
        }
        .pbv-fcta-link:hover { text-decoration-color: #fff; }
        .pbv-fcta-link:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
        .pbv-fcta-alt {
          margin: 26px 0 0;
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .pbv-fcta-alt a { color: rgba(255, 255, 255, 0.85); }
      `}</style>
    </section>
  );
}
