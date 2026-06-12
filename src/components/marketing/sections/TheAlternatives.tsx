"use client";

import Link from "next/link";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

// The VS section — the sell the site never made. Posterboy isn't competing
// with Buffer on features; it's competing with the owner's three real
// options. Name them honestly, in the house voice, then offer the fourth.

const OPTIONS = [
  {
    name: "Do it yourself",
    cost: "$30/mo + your evenings",
    copy:
      "Buffer, Canva, a content calendar, and every Sunday night for the rest of your life. The tools schedule. You still do the work.",
  },
  {
    name: "Hire an agency",
    cost: "$1,500+/mo + meetings",
    copy:
      "Great work, eventually. After the onboarding call, the strategy deck, the revision rounds, and the invoice.",
  },
  {
    name: "Go quiet",
    cost: "$0 + your customers",
    copy:
      "The cheapest option, until it isn't. A silent feed reads as a closed business.",
  },
];

export default function TheAlternatives() {
  return (
    <section className="alts" id="why">
      <div className="alts-head">
        <span className="section-num alts-kicker">The honest comparison</span>
        <h2 className="type-h2">
          You have
          <br />
          <em>three options.</em>
        </h2>
      </div>

      <div className="alts-grid">
        {OPTIONS.map((o, i) => (
          <div className="alts-card" key={o.name}>
            <span className="alts-num type-label">0{i + 1}</span>
            <h3 className="alts-name">{o.name}</h3>
            <p className="alts-copy type-body">{o.copy}</p>
            <span className="alts-cost type-label">{o.cost}</span>
          </div>
        ))}
      </div>

      <div className="alts-fourth">
        <div>
          <span className="alts-num type-label alts-num-red">04</span>
          <h3 className="alts-fourth-title">
            Or: posterboy writes, schedules, and publishes — in your voice.
            You approve from your phone.
          </h3>
          <p className="alts-fourth-cost type-body">
            $99/mo. No meetings. No Sunday nights.
          </p>
        </div>
        <Link href={SIGNUP_ONBOARDING_URL} className="neu-btn">
          Get started
        </Link>
      </div>

      <style>{`
        .pb-marketing-site .alts {
          padding: clamp(80px, 12vh, 160px) var(--px);
          max-width: 1180px;
          margin: 0 auto;
        }
        .pb-marketing-site .alts-kicker { color: var(--pb-red); display: block; margin-bottom: 18px; }
        .pb-marketing-site .alts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(0,0,0,0.12);
          border-top: 1px solid rgba(0,0,0,0.12);
          border-bottom: 1px solid rgba(0,0,0,0.12);
          margin-top: 56px;
        }
        @media (max-width: 860px) {
          .pb-marketing-site .alts-grid { grid-template-columns: 1fr; }
        }
        .pb-marketing-site .alts-card {
          background: var(--bone, #f5f3ef);
          padding: clamp(28px, 3.4vw, 44px);
          display: flex; flex-direction: column;
          transition: var(--transition-color);
        }
        .pb-marketing-site .alts-card:hover { background: rgba(255,255,255,0.55); }
        .pb-marketing-site .alts-num { color: var(--quiet-sage); margin-bottom: 22px; }
        .pb-marketing-site .alts-num-red { color: var(--pb-red); }
        .pb-marketing-site .alts-name {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(22px, 2.4vw, 30px);
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          color: var(--ink);
        }
        .pb-marketing-site .alts-copy { color: var(--quiet-sage); margin: 0 0 28px; flex: 1; }
        .pb-marketing-site .alts-cost { color: var(--ink); }
        .pb-marketing-site .alts-fourth {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 32px; flex-wrap: wrap;
          margin-top: clamp(40px, 6vh, 72px);
        }
        .pb-marketing-site .alts-fourth-title {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(24px, 3.2vw, 42px);
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--ink);
          max-width: 720px;
          margin: 18px 0 12px;
        }
        .pb-marketing-site .alts-fourth-cost { color: var(--pb-red); font-weight: 600; }
      `}</style>
    </section>
  );
}
