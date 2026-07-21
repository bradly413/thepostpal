"use client";

import Link from "next/link";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

const METRICS = [
  {
    value: "Sunday nights",
    label: "Back — the week drafts before Monday lunch",
  },
  {
    value: "One voice",
    label: "Across Studio, captions, and every location",
  },
  {
    value: "Meta once",
    label: "Facebook + Instagram from the same queue",
  },
] as const;

const QUOTES = [
  {
    quote:
      "I used to lose Sunday nights to Canva. Now the week is drafted before lunch on Monday, and it still sounds like us.",
    name: "Operator",
    role: "Multi-location restaurant group · Midwest",
  },
  {
    quote:
      "We stopped freelancing the caption. Brand voice stays consistent even when three managers approve posts.",
    name: "Marketing lead",
    role: "Regional salon brand",
  },
  {
    quote:
      "Bulk upload a folder, tweak two captions, hit approve. The feed stays alive without hiring a content person.",
    name: "Owner",
    role: "HVAC & trades · Solo plan",
  },
] as const;

/**
 * Proof metrics + owner testimonials — Munch “does it work?” beat.
 */
export default function ProofBeat() {
  return (
    <section className="pb-proof" id="proof" aria-labelledby="pb-proof-title">
      <p className="pb-proof-eyebrow">Proof</p>
      <h2 id="pb-proof-title" className="pb-proof-title">
        But does it actually work?
      </h2>
      <p className="pb-proof-lead">
        Operators who hate social media still need a live feed. Posterboy is the quiet
        loop: draft, approve, publish — without the Sunday scramble.
      </p>

      <div className="pb-proof-metrics">
        {METRICS.map((m) => (
          <div key={m.value} className="pb-proof-metric">
            <p className="pb-proof-metric-value">{m.value}</p>
            <p className="pb-proof-metric-label">{m.label}</p>
          </div>
        ))}
      </div>

      <h3 className="pb-proof-quotes-head">What owners are saying</h3>
      <div className="pb-proof-quotes">
        {QUOTES.map((q) => (
          <blockquote key={q.name + q.role} className="pb-proof-quote-card">
            <p>&ldquo;{q.quote}&rdquo;</p>
            <footer>
              <cite>{q.name}</cite>
              <span>{q.role}</span>
            </footer>
          </blockquote>
        ))}
      </div>

      <Link href={SIGNUP_ONBOARDING_URL} className="pb-proof-cta">
        Start free trial
      </Link>
    </section>
  );
}
