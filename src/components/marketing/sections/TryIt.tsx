"use client";

import { useState } from "react";
import Link from "next/link";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

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
      setError("The drafting engine is busy right now - try again in a minute.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <section className="tryit" id="try">
      <div className="tryit-head">
        <p className="tryit-kicker">Try it now</p>
        <h2>
          Say it. <strong>It&rsquo;s made.</strong>
        </h2>
        <p className="tryit-sub">
          Tell it what kind of business you run. It drafts your week - written like a
          person, scheduled on the right days. This is the actual engine, not a demo reel.
        </p>
      </div>

      <form className="tryit-form" onSubmit={draft}>
        <input
          className="tryit-input"
          type="text"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          placeholder="What's your business? bakery, salon, realtor…"
          aria-label="What kind of business do you run?"
          required
        />
        <input
          className="tryit-input"
          type="text"
          value={happening}
          onChange={(e) => setHappening(e.target.value)}
          placeholder="Anything happening? Saturday class, new menu… (optional)"
          aria-label="Anything happening this week? Optional."
        />
        <button type="submit" className="tryit-btn" disabled={drafting} aria-busy={drafting}>
          {drafting ? "Drafting your week…" : "Draft my week"}
        </button>
      </form>

      {error ? <p className="tryit-error">{error}</p> : null}

      {posts ? (
        <div className="tryit-result" aria-live="polite">
          {summary ? <p className="tryit-summary">{summary}</p> : null}
          <div className="tryit-week">
            {posts.map((p) => (
              <div className="tryit-post" key={`${p.day}-${p.time}`}>
                <span className="tryit-when">
                  {p.day} · {p.time}
                </span>
                <p className="tryit-copy">{p.copy}</p>
              </div>
            ))}
          </div>
          <div className="tryit-after">
            <p>
              That took about ten seconds. posterboy does this every week - with your
              photos, your voice, and a calendar that publishes itself.
            </p>
            <Link href={SIGNUP_ONBOARDING_URL} className="tryit-btn">
              Join free beta
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
