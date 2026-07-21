"use client";

import Link from "next/link";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

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
        <p className="alts-kicker">The honest comparison</p>
        <h2>
          You have <strong>three options.</strong>
        </h2>
      </div>

      <div className="alts-grid">
        {OPTIONS.map((o, i) => (
          <div className="alts-card" key={o.name}>
            <span className="alts-num">0{i + 1}</span>
            <h3 className="alts-name">{o.name}</h3>
            <p className="alts-copy">{o.copy}</p>
            <span className="alts-cost">{o.cost}</span>
          </div>
        ))}
      </div>

      <div className="alts-fourth">
        <div>
          <span className="alts-num alts-num-red">04</span>
          <h3 className="alts-fourth-title">
            Or: posterboy writes, schedules, and publishes in your voice. You
            approve from your phone.
          </h3>
          <p className="alts-fourth-cost">$99/mo. No meetings. No Sunday nights.</p>
        </div>
        <Link href={SIGNUP_ONBOARDING_URL} className="alts-cta">
          Start free trial
        </Link>
      </div>
    </section>
  );
}
