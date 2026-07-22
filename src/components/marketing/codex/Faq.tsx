"use client";

import { useState } from "react";
import { track } from "@/lib/marketing/track";

const FAQS = [
  {
    q: "Does Posterboy publish without approval?",
    a: "No. Nothing goes out until you approve it. Approved posts then publish to Facebook and Instagram on schedule. If a publish fails, it surfaces with a retry instead of disappearing.",
  },
  {
    q: "What if a caption does not sound like us?",
    a: "Edit it, rewrite it, swap the image, or skip it. The drafts you change teach the next batch. Onboarding builds a brand book — tone, phrases, and words to avoid — so auto captions start closer to your voice.",
  },
  {
    q: "Can I schedule a full month at once?",
    a: "Yes. Create in Studio, generate captions in bulk, and drop posts across the calendar as far ahead as you want — a month out or further.",
  },
  {
    q: "Which social channels are supported now?",
    a: "Facebook and Instagram through Meta. Connect once, then schedule and publish both from the same post. That is the honest list — we would rather do two platforms well.",
  },
  {
    q: "Can multiple locations approve separately?",
    a: "Yes, on Command. One login, per-location brand kits and calendars, centralized or local approvals, and roll-up visibility.",
  },
  {
    q: "What happens when a post fails to publish?",
    a: "It is marked failed with an error log and a retry. Partial success is recorded so a retry never double-posts to a platform that already went out.",
  },
  {
    q: "Is this free during beta?",
    a: "Yes. Closed beta is free and we do not ask for a card. Solo and Command prices on the pricing page are what paid plans cost after beta — you are not charged to join now.",
  },
  {
    q: "Can I cancel?",
    a: "Anytime, from your account — no phone call, no exit interview. Everything you made is yours to keep.",
  },
] as const;

/** FAQ accordion — one answer open at a time. */
export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="pb-faq" id="faq" aria-labelledby="pb-faq-title">
      <p className="pb-faq-kicker">FAQ</p>
      <h2 id="pb-faq-title">Before you start</h2>

      <div className="pb-faq-list">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className={`pb-faq-item${isOpen ? " is-open" : ""}`}>
              <h3>
                <button
                  type="button"
                  className="pb-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpen(isOpen ? null : i);
                    if (!isOpen) track("faq_opened", { question: item.q.slice(0, 40) });
                  }}
                >
                  <span>{item.q}</span>
                  <span className="pb-faq-icon" aria-hidden>
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
              </h3>
              {isOpen ? <p className="pb-faq-a">{item.a}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
