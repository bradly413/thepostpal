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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(generateWeeklyPosts({ businessType, whatsNew, offerOrEvent: offer, tone }));
  }

  return (
    <MarketingSubpageChrome>
      <section className="pb-hero">
        <h1>What should I post this week?</h1>
        <p className="pb-hero-sub">
          Five suggestions. A suggested schedule. No AI required. posterboy can draft the rest.
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
          <button type="submit" className="pb-btn-primary">
            Draft my week
          </button>
        </form>

        {result && (
          <div style={{ marginTop: "3rem" }}>
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
