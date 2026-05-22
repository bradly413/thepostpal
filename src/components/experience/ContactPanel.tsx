"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  { label: "What's your name?", placeholder: "Your full name is preferred", field: "name" as const },
  { label: "Work email?", placeholder: "you@bakery.com", field: "email" as const },
  { label: "Business type?", placeholder: "bakery, broker, restaurant…", field: "type" as const },
];

export default function ContactPanel({ visible }: { visible: boolean }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: "", email: "", type: "" });
  const current = STEPS[step];

  function advance() {
    const val = data[current.field].trim();
    if (!val) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      advance();
    }
  }

  if (!visible) return null;

  return (
    <div className="pb-xp-contact">
      <div className="pb-xp-contact-inner">
        <div className="pb-xp-contact-top">
          <p className="pb-xp-contact-title">REQUEST AN INTRODUCTION</p>
          <p className="pb-xp-contact-step">{String(step + 1).padStart(2, "0")} / 03</p>
        </div>
        <div className="pb-xp-contact-body">
          <div className="pb-xp-contact-story">
            <p>Your week is drafted. We just need to know who you are first.</p>
          </div>
          <div className="pb-xp-contact-form">
            <label className="pb-xp-form-label">{current.label}</label>
            <input
              type={current.field === "email" ? "email" : "text"}
              value={data[current.field]}
              onChange={(e) => setData({ ...data, [current.field]: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={current.placeholder}
              className="pb-xp-form-input"
              autoFocus
            />
            <p className="pb-xp-form-hint">Press enter</p>
            {step === STEPS.length - 1 ? (
              <Link href="/sign-in" className="pb-xp-contact-orb">
                Try posterboy
              </Link>
            ) : (
              <button type="button" className="pb-xp-contact-orb" onClick={advance} disabled={!data[current.field].trim()}>
                Next step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
