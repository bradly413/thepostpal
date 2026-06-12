"use client";

import { useState } from "react";
import Link from "next/link";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

// "Say it. It's made." — the proof section. The one thing no competitor page
// can show: type a sentence about your business, watch a real week get
// drafted by the same engine the product uses. No mockups, no canned demo.

interface WeekPost {
  day: string;
  time: string;
  copy: string;
}

export default function TryIt() {
  const [businessType, setBusinessType] = useState("");
  const [happening, setHappening] = useState("");
  const [posts, setPosts] = useState<WeekPost[] | null>(null);
  const [summary, setSummary] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");

  async function draft(e: React.FormEvent) {
    e.preventDefault();
    if (drafting || !businessType.trim()) return;
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/tools/what-to-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType, whatsNew: happening, offer: "", tone: "warm" }),
      });
      const data = (await res.json()) as { summary?: string; posts?: WeekPost[]; error?: string };
      if (!res.ok || !Array.isArray(data.posts)) {
        throw new Error(data.error || "busy");
      }
      setPosts(data.posts);
      setSummary(data.summary || "");
    } catch {
      setError("The drafting engine is busy right now — try again in a minute.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <section className="tryit" id="try">
      <div className="tryit-head">
        <span className="section-num tryit-kicker">Try it now</span>
        <h2 className="type-h2">
          Say it.
          <br />
          <em>It&rsquo;s made.</em>
        </h2>
        <p className="type-body tryit-sub">
          Tell it what kind of business you run. It drafts your week — written
          like a person, scheduled on the right days. This is the actual engine,
          not a demo reel.
        </p>
      </div>

      <form className="tryit-form" onSubmit={draft}>
        <input
          className="tryit-input"
          type="text"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          placeholder="What's your business? — bakery, salon, realtor…"
          aria-label="What kind of business do you run?"
          required
        />
        <input
          className="tryit-input"
          type="text"
          value={happening}
          onChange={(e) => setHappening(e.target.value)}
          placeholder="Anything happening? — Saturday class, new menu… (optional)"
          aria-label="Anything happening this week? Optional."
        />
        <button type="submit" className="neu-btn tryit-btn" disabled={drafting} aria-busy={drafting}>
          {drafting ? "Drafting your week…" : "Draft my week"}
        </button>
      </form>

      {error ? <p className="tryit-error type-caption">{error}</p> : null}

      {posts ? (
        <div className="tryit-result" aria-live="polite">
          {summary ? <p className="type-caption tryit-summary">{summary}</p> : null}
          <div className="tryit-week">
            {posts.map((p) => (
              <div className="tryit-post" key={`${p.day}-${p.time}`}>
                <span className="tryit-when type-label">
                  {p.day} · {p.time}
                </span>
                <p className="tryit-copy">{p.copy}</p>
              </div>
            ))}
          </div>
          <div className="tryit-after">
            <p className="type-body">
              That took about ten seconds. posterboy does this every week —
              with your photos, your voice, and a calendar that publishes itself.
            </p>
            <Link href={SIGNUP_ONBOARDING_URL} className="neu-btn">
              Get started
            </Link>
          </div>
        </div>
      ) : null}

      <style>{`
        .pb-marketing-site .tryit {
          padding: clamp(80px, 12vh, 160px) var(--px);
          max-width: 980px;
          margin: 0 auto;
        }
        .pb-marketing-site .tryit-kicker { color: var(--pb-red); display: block; margin-bottom: 18px; }
        .pb-marketing-site .tryit-sub { max-width: 460px; margin-top: 18px; color: var(--quiet-sage); }
        .pb-marketing-site .tryit-form {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          margin-top: 40px;
          align-items: stretch;
        }
        @media (max-width: 760px) {
          .pb-marketing-site .tryit-form { grid-template-columns: 1fr; }
        }
        .pb-marketing-site .tryit-input {
          font-family: var(--font-sans);
          font-size: 14px;
          padding: 14px 18px;
          background: transparent;
          border: 1px solid rgba(0,0,0,0.18);
          border-radius: 12px;
          color: var(--ink);
          outline: none;
          transition: var(--transition-color), var(--transition-shadow);
        }
        .pb-marketing-site .tryit-input:focus {
          border-color: var(--ink);
          box-shadow: 0 0 0 3px rgba(238,37,50,0.08);
        }
        .pb-marketing-site .tryit-btn { white-space: nowrap; }
        .pb-marketing-site .tryit-btn:disabled { opacity: 0.6; cursor: default; }
        .pb-marketing-site .tryit-error { margin-top: 14px; color: var(--pb-red); }
        .pb-marketing-site .tryit-result { margin-top: 48px; }
        .pb-marketing-site .tryit-summary { margin-bottom: 18px; }
        .pb-marketing-site .tryit-week {
          display: flex; flex-direction: column;
          border-top: 1px solid rgba(0,0,0,0.12);
        }
        .pb-marketing-site .tryit-post {
          display: grid; grid-template-columns: 160px 1fr; gap: 20px;
          padding: 18px 4px;
          border-bottom: 1px solid rgba(0,0,0,0.12);
          opacity: 0;
          animation: tryitIn var(--duration-moderate, 280ms) var(--ease-enter, ease-out) forwards;
        }
        .pb-marketing-site .tryit-post:nth-child(1) { animation-delay: 60ms; }
        .pb-marketing-site .tryit-post:nth-child(2) { animation-delay: 140ms; }
        .pb-marketing-site .tryit-post:nth-child(3) { animation-delay: 220ms; }
        .pb-marketing-site .tryit-post:nth-child(4) { animation-delay: 300ms; }
        .pb-marketing-site .tryit-post:nth-child(5) { animation-delay: 380ms; }
        @keyframes tryitIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (max-width: 600px) {
          .pb-marketing-site .tryit-post { grid-template-columns: 1fr; gap: 6px; }
        }
        .pb-marketing-site .tryit-when { color: var(--pb-red); align-self: start; padding-top: 3px; }
        .pb-marketing-site .tryit-copy { margin: 0; font-size: 15px; line-height: 1.6; color: var(--ink); }
        .pb-marketing-site .tryit-after {
          margin-top: 40px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px; flex-wrap: wrap;
        }
        .pb-marketing-site .tryit-after p { max-width: 480px; }
        @media (prefers-reduced-motion: reduce) {
          .pb-marketing-site .tryit-post { animation: none; opacity: 1; }
        }
      `}</style>
    </section>
  );
}
