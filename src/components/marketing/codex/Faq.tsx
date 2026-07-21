"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is Posterboy?",
    a: "A calm social-media tool for local businesses. Studio drafts images, captions match your voice, Schedule queues the week, and Meta publishes to Facebook and Instagram.",
  },
  {
    q: "Does Posterboy post automatically?",
    a: "Yes — once you approve posts into the publish queue. Our cron publishes on schedule. You stay in control; nothing goes out without approval.",
  },
  {
    q: "Which platforms are supported?",
    a: "Facebook and Instagram via Meta. Connect once, then schedule and publish from the same post.",
  },
  {
    q: "Do I need to design or write everything myself?",
    a: "No. Describe the post in plain language. Studio drafts the image; captions draft in your brand voice. You edit what you want and approve the rest.",
  },
  {
    q: "Can I customize what it creates?",
    a: "Always. Edit captions, swap images, adjust schedule times, or rewrite in Studio. We learn from what you keep.",
  },
  {
    q: "How much time does it take each week?",
    a: "Most operators spend about ten quiet minutes approving the week. Bulk upload helps when you already have a folder of assets.",
  },
  {
    q: "Will it match my brand voice?",
    a: "Yes. Onboarding builds a brand book and voice profile. Captions and Studio prompts use that — not generic content-calendar speak.",
  },
  {
    q: "What's the difference between Solo and Command?",
    a: "Solo is one premium operator workspace. Command adds multi-location rollups, per-location brand kits, and centralized approvals.",
  },
  {
    q: "Who owns the content?",
    a: "You do. Images and copy you generate or upload are yours to use on your channels.",
  },
  {
    q: "How do I get started?",
    a: "Start a free trial, connect Meta, run Brand Architect once, then draft your first week in Studio and Schedule.",
  },
] as const;

/** FAQ accordion for the marketing home. */
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
                  onClick={() => setOpen(isOpen ? null : i)}
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
