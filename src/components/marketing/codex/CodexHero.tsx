"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CORE } from "@/lib/posterboy-copy";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { VERTICALS } from "@/lib/verticals";

interface WeekPost {
  day: string;
  time: string;
  copy: string;
}

const SAMPLE_CARDS = [
  {
    src: "/marketing/capabilities/cap-studio.jpg",
    alt: "Studio-generated social image",
    caption: "Studio",
  },
  {
    src: "/images/social-mocks/05.png",
    alt: "Captioned feed post",
    caption: "Captions",
  },
  {
    src: "/marketing/capabilities/cap-schedule.jpg",
    alt: "Week on the calendar",
    caption: "Schedule",
  },
  {
    src: "/images/social-mocks/04.png",
    alt: "Published story",
    caption: "Publish",
  },
  {
    src: "/marketing/capabilities/cap-publish.jpg",
    alt: "Connected channels",
    caption: "Channels",
  },
] as const;

const TRUST_SLUGS = [
  "realtors",
  "restaurants",
  "salons",
  "hvac-trades",
  "local-services",
  "multi-location",
] as const;

/**
 * Centered hero: brand + one headline + Try It input CTA + sample cards.
 * Munch conversion spine, Posterboy warm-light brand.
 */
export default function CodexHero() {
  const [businessType, setBusinessType] = useState("");
  const [happening, setHappening] = useState("");
  const [posts, setPosts] = useState<WeekPost[] | null>(null);
  const [summary, setSummary] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");

  const trustItems = TRUST_SLUGS.map((slug) => VERTICALS.find((v) => v.slug === slug)).filter(
    (v): v is (typeof VERTICALS)[number] => Boolean(v),
  );

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
    <section className="pb-munch-hero reveal is-visible" aria-labelledby="hero-title" id="hero" data-hero>
      <div className="pb-munch-hero-inner">
        <p className="pb-munch-hero-brand" aria-hidden="true">
          poster<em>boy</em>
        </p>
        <h1 id="hero-title" className="pb-munch-hero-title">
          Social media for people who hate social media.
        </h1>
        <p className="pb-munch-hero-sub">{CORE.subtitle}</p>

        <p className="pb-munch-hero-prompt">Tell us what you run — watch a week get drafted.</p>

        <form className="pb-munch-hero-form" onSubmit={draft}>
          <input
            className="pb-munch-hero-input"
            type="text"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="bakery, salon, realtor…"
            aria-label="What kind of business do you run?"
            required
          />
          <input
            className="pb-munch-hero-input pb-munch-hero-input--secondary"
            type="text"
            value={happening}
            onChange={(e) => setHappening(e.target.value)}
            placeholder="Anything happening this week? (optional)"
            aria-label="Anything happening this week? Optional."
          />
          <button type="submit" className="pb-munch-hero-submit" disabled={drafting} aria-busy={drafting}>
            {drafting ? "Drafting…" : "Draft my week"}
          </button>
        </form>

        <div className="pb-munch-hero-secondary">
          <Link href={SIGNUP_ONBOARDING_URL}>Start free trial</Link>
          <span aria-hidden="true">·</span>
          <Link href="/sign-in">Sign in</Link>
        </div>

        {error ? <p className="pb-munch-hero-error">{error}</p> : null}

        {posts ? (
          <div className="pb-munch-hero-result" aria-live="polite">
            {summary ? <p className="pb-munch-hero-summary">{summary}</p> : null}
            <div className="pb-munch-hero-week">
              {posts.map((p) => (
                <div className="pb-munch-hero-post" key={`${p.day}-${p.time}`}>
                  <span className="pb-munch-hero-when">
                    {p.day} · {p.time}
                  </span>
                  <p>{p.copy}</p>
                </div>
              ))}
            </div>
            <Link href={SIGNUP_ONBOARDING_URL} className="pb-munch-hero-result-cta">
              Start free trial
            </Link>
          </div>
        ) : null}

        <div className="pb-munch-trust" aria-label="Built for local businesses">
          {trustItems.map((item) => (
            <Link key={item.slug} href={`/for/${item.slug}`} className="pb-munch-trust-item">
              {item.name}
            </Link>
          ))}
        </div>

        <div className="pb-munch-samples" aria-label="Sample posts">
          {SAMPLE_CARDS.map((card) => (
            <figure key={card.caption} className="pb-munch-sample">
              <Image
                src={card.src}
                alt={card.alt}
                width={280}
                height={360}
                className="pb-munch-sample-img"
              />
              <figcaption>{card.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
