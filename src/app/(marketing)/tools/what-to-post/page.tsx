"use client";

import Link from "next/link";
import { useState } from "react";
import MarketingSubpageChrome from "@/components/marketing/MarketingSubpageChrome";
import { generateWeeklyPosts } from "@/lib/post-generator-tool";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

export default function WhatToPostPage() {
  const [businessType, setBusinessType] = useState("");
  const [whatsNew, setWhatsNew] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("calm");
  const [result, setResult] = useState<ReturnType<typeof generateWeeklyPosts> | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [fellBack, setFellBack] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (drafting) return;
    setDrafting(true);
    setFellBack(false);
    try {
      // Real drafts from the same engine the product uses; the static
      // templates below are only the no-AI fallback.
      const res = await fetch("/api/tools/what-to-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType, whatsNew, offer, tone }),
      });
      const data = (await res.json()) as ReturnType<typeof generateWeeklyPosts> & { error?: string };
      if (!res.ok || !Array.isArray(data.posts)) throw new Error(data.error || "unavailable");
      setResult({ summary: data.summary, posts: data.posts });
    } catch {
      setFellBack(true);
      setResult(generateWeeklyPosts({ businessType, whatsNew, offerOrEvent: offer, tone }));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <MarketingSubpageChrome>
      <section className="pb-hero">
        <h1>What should I post this week?</h1>
        <p className="pb-hero-sub">
          Five real drafts, written for your business in your tone — the same engine
          posterboy uses. Takes about ten seconds.
        </p>
      </section>

      <section className="pb-section pb-section-narrow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm mb-1">Business type</span>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="bakery, restaurant, realtor…"
              className="w-full border border-black/15 px-3 py-2 bg-transparent"
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">What&apos;s new this week?</span>
            <input
              type="text"
              value={whatsNew}
              onChange={(e) => setWhatsNew(e.target.value)}
              placeholder="New sourdough schedule, listing on Maple…"
              className="w-full border border-black/15 px-3 py-2 bg-transparent"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">Any offer or event?</span>
            <input
              type="text"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="Saturday class, open house…"
              className="w-full border border-black/15 px-3 py-2 bg-transparent"
            />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">Tone</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full border border-black/15 px-3 py-2 bg-transparent"
            >
              <option value="calm">Calm</option>
              <option value="dry">Dry</option>
              <option value="warm">Warm</option>
              <option value="professional">Professional</option>
            </select>
          </label>
          <button type="submit" className="pb-btn-primary" disabled={drafting} aria-busy={drafting}>
            {drafting ? "Drafting your week…" : "Draft my week"}
          </button>
        </form>

        {result && (
          <div style={{ marginTop: "3rem" }} aria-live="polite">
            {fellBack ? (
              <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem", opacity: 0.65 }}>
                The drafting engine is busy — here&apos;s a starting structure instead.
              </p>
            ) : null}
            <p style={{ marginBottom: "1rem" }}>{result.summary}</p>
            <div className="pb-draft-preview">
              {result.posts.map((post) => (
                <div key={`${post.day}-${post.time}`} className="pb-draft-line">
                  <time>{post.day} {post.time}</time>
                  {post.copy}
                </div>
              ))}
            </div>
            <p style={{ marginTop: "2rem" }}>
              <Link href={SIGNUP_ONBOARDING_URL} className="pb-btn-primary" style={{ display: "inline-flex" }}>
                Let posterboy draft the rest
              </Link>
            </p>
          </div>
        )}
      </section>
    </MarketingSubpageChrome>
  );
}
