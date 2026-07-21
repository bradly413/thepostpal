"use client";

import { useState } from "react";
import { track } from "@/lib/marketing/track";

// Answers are grounded in real product behavior: brand-voice onboarding,
// editable drafts, Facebook + Instagram via Meta, an approval-gated publish
// queue (nothing publishes without approval), and Command for multi-location.
const FAQS = [
  {
    q: "Does it actually sound like me?",
    a: "That's the whole point. Onboarding builds a brand book and voice profile — tone, phrases, words to avoid — and drafts are written from that, not from generic content-calendar speak. We learn your voice from your edits, not your prompts.",
  },
  {
    q: "What if I don't like a post?",
    a: "Edit it, rewrite it in Studio, swap the image, or just don't approve it. Nothing publishes without your approval, and the drafts you change teach the next batch to sound more like you.",
  },
  {
    q: "Which platforms does Posterboy support?",
    a: "Facebook and Instagram, through Meta. Connect once, then schedule and publish both from the same post. That's the honest list — we'd rather do two platforms well.",
  },
  {
    q: "Do I own the content?",
    a: "You do. Images and copy you generate or upload are yours to use on your channels, whether or not you keep using Posterboy.",
  },
  {
    q: "How does Posterboy handle multiple locations?",
    a: "That's Command. One login, per-location brand kits and calendars, centralized approvals, and roll-up visibility — so the brand stays consistent without three managers freelancing the caption.",
  },
  {
    q: "How long does setup take?",
    a: "Connecting Facebook and Instagram takes about two minutes. Brand voice setup is a one-time pass through your menu, your old posts, or a short questionnaire. You can be approving your first drafted week the same day you sign up.",
  },
  {
    q: "Can I write my own captions sometimes?",
    a: "Always. Write from scratch, paste something in, or edit a draft — Posterboy schedules and publishes it the same way. The AI is there for the weeks you don't feel like typing.",
  },
  {
    q: "What happens if I forget to approve a post?",
    a: "Nothing goes out. Unapproved drafts simply wait for you — Posterboy never publishes something you haven't approved. Approved posts publish on schedule, and if one fails it surfaces with a retry instead of disappearing.",
  },
] as const;

/** FAQ accordion — one answer open at a time, real buttons, aria-expanded. */
export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="pb-faq" id="faq" aria-labelledby="pb-faq-title">
      <p className="pb-faq-kicker">FAQ</p>
      <h2 id="pb-faq-title">Frequently asked questions</h2>

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
