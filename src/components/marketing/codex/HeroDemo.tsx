"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { useFeedDemo } from "@/components/marketing/codex/useFeedDemo";
import { DEMO_CATEGORIES, getDemoCategory } from "@/components/marketing/codex/demo-feed";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { VERTICALS } from "@/lib/verticals";
import { track } from "@/lib/marketing/track";

const IDLE_CYCLE_MS = 4500;

/**
 * Fixed ambient tiles around the featured trio. These four images belong to
 * no demo category, so they can never duplicate a featured tile.
 */
const AMBIENT_TILES = [
  { src: "/hero-ring/06.jpg", alt: "" },
  { src: "/hero-ring/12.jpg", alt: "" },
  { src: "/hero-ring/13.jpg", alt: "" },
  { src: "/hero-ring/18.jpg", alt: "" },
] as const;

const TRUST_SLUGS = ["restaurants", "realtors", "salons", "hvac-trades", "local-services"] as const;

/** Crossfading image slot for the featured orbit tiles. */
function FeatureTile({
  src,
  alt,
  width,
  height,
  priority,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}) {
  const [layers, setLayers] = useState<[string, string | null]>([src, null]);

  // Derived-state adjustment during render (React-documented pattern) — when
  // the src prop changes, the old front image becomes the crossfade backdrop.
  if (layers[0] !== src) {
    setLayers([src, layers[0]]);
  }

  return (
    <span className="pbx-tile-swap">
      {layers[1] ? (
        <Image
          key={`back-${layers[1]}`}
          src={layers[1]}
          alt=""
          width={width}
          height={height}
          className="pbx-tile-img pbx-tile-img--back"
          aria-hidden
        />
      ) : null}
      <Image
        key={`front-${layers[0]}`}
        src={layers[0]}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="pbx-tile-img pbx-tile-img--front"
      />
    </span>
  );
}

/**
 * Hero — live demo. Pick a business type, watch three posts write themselves.
 * Idle: the featured tiles slowly cycle business categories. Submit: the tile
 * field gives way to three drafted posts (live engine, pre-written fallback).
 */
export default function HeroDemo() {
  const rootRef = useRef<HTMLElement | null>(null);
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const typedRef = useRef<HTMLParagraphElement | null>(null);
  const floatTl = useRef<gsap.core.Timeline | null>(null);

  const { ready, reducedMotion } = useMarketingScroll();
  const { status, result, submit, retry } = useFeedDemo("hero");

  const [selected, setSelected] = useState<string | null>(null);
  const [idleIndex, setIdleIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [businessName, setBusinessName] = useState("");

  const activeCategory = useMemo(
    () => getDemoCategory(selected ?? DEMO_CATEGORIES[idleIndex].id),
    [selected, idleIndex],
  );

  const trustItems = TRUST_SLUGS.map((slug) => VERTICALS.find((v) => v.slug === slug)).filter(
    (v): v is (typeof VERTICALS)[number] => Boolean(v),
  );

  // Idle cycle: only while nothing is selected, nothing is generating, and the
  // visitor isn't touching the controls. Reduced motion opts out entirely.
  useEffect(() => {
    if (selected || paused || status !== "idle" || reducedMotion) return;
    const timer = setInterval(
      () => setIdleIndex((i) => (i + 1) % DEMO_CATEGORIES.length),
      IDLE_CYCLE_MS,
    );
    return () => clearInterval(timer);
  }, [selected, paused, status, reducedMotion]);

  // Entrance + idle float. Section-scoped; transform/opacity only.
  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;

      if (reducedMotion) {
        gsap.set(root.querySelectorAll(".pbx-fade, .pbx-slot"), { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo(
        root.querySelectorAll(".pbx-fade"),
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 },
      );
      tl.fromTo(
        root.querySelectorAll(".pbx-slot"),
        { opacity: 0, y: 34, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.07 },
        "-=0.45",
      );

      // Gentle idle float on the tile field.
      const float = gsap.timeline({ repeat: -1, yoyo: true });
      root.querySelectorAll<HTMLElement>(".pbx-slot").forEach((slot, i) => {
        float.to(
          slot,
          { y: i % 2 ? 9 : -9, duration: 3.2 + (i % 3) * 0.5, ease: "power1.inOut" },
          i * 0.12,
        );
      });
      floatTl.current = float;
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  // Slow the float while the visitor is using the form.
  useEffect(() => {
    if (!floatTl.current) return;
    gsap.to(floatTl.current, { timeScale: paused ? 0.25 : 1, duration: 0.4 });
  }, [paused]);

  // Result transition: tiles give way, cards arrive, first caption types.
  useGSAP(
    () => {
      const orbit = orbitRef.current;
      const results = resultsRef.current;
      if (status !== "done" || !results || !result) {
        // Back to the picker (retry) — bring the tile field home.
        if (orbit) {
          if (reducedMotion) gsap.set(orbit, { autoAlpha: 1, scale: 1 });
          else gsap.to(orbit, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power2.out" });
        }
        return;
      }

      if (reducedMotion) {
        if (orbit) gsap.set(orbit, { autoAlpha: 0 });
        gsap.set(results, { autoAlpha: 1 });
        gsap.set(results.querySelectorAll(".pbx-post"), { opacity: 1, y: 0 });
        if (typedRef.current) typedRef.current.textContent = result.posts[0]?.copy ?? "";
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      if (orbit) {
        tl.to(orbit, { autoAlpha: 0, scale: 0.92, duration: 0.45, ease: "power2.inOut" });
      }
      tl.fromTo(results, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, "-=0.15");
      tl.fromTo(
        results.querySelectorAll(".pbx-post"),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.14 },
        "-=0.1",
      );
      const typed = typedRef.current;
      const copy = result.posts[0]?.copy ?? "";
      if (typed && copy) {
        const o = { n: 0 };
        tl.to(
          o,
          {
            n: copy.length,
            duration: Math.min(1.4, copy.length * 0.02),
            ease: "none",
            onUpdate: () => {
              typed.textContent = copy.slice(0, Math.round(o.n));
            },
          },
          "-=0.35",
        );
      }
    },
    { scope: rootRef, dependencies: [status, result, reducedMotion] },
  );

  const pickCategory = useCallback((id: string) => {
    setSelected(id);
    track("category_selected", { category: id, location: "hero" });
  }, []);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (status === "writing") return;
      if (status === "done") {
        // "Try another business type." — back to the picker.
        retry();
        setSelected(null);
        return;
      }
      void submit(activeCategory.id, businessName);
    },
    [status, retry, submit, activeCategory.id, businessName],
  );

  const buttonLabel =
    status === "writing"
      ? "Writing your posts..."
      : status === "done"
        ? "Try another business type."
        : "Show me my feed";

  // Three featured tiles: the category's own images, padded from the wider
  // Studio pool when a category has fewer than three (never repeat a tile).
  const featureTiles = useMemo(() => {
    const own = activeCategory.tiles.slice(0, 3);
    if (own.length < 3) {
      const used = new Set(own.map((t) => t.src));
      for (const cat of DEMO_CATEGORIES) {
        for (const tile of cat.tiles) {
          if (own.length === 3) break;
          if (!used.has(tile.src)) {
            own.push(tile);
            used.add(tile.src);
          }
        }
        if (own.length === 3) break;
      }
    }
    return own;
  }, [activeCategory]);

  return (
    <section
      className="hero pbx-hero"
      id="demo"
      aria-labelledby="pbx-hero-title"
      ref={rootRef}
      data-hero
    >
      <div className="pbx-hero-grid">
        <div className="pbx-hero-copy">
          <p className="pbx-hero-brand pbx-fade" aria-hidden="true">
            poster<em>boy</em>
          </p>
          <h1 id="pbx-hero-title" className="pbx-hero-title pbx-fade">
            You run the place. We&rsquo;ll run the feed.
          </h1>
          <p className="pbx-hero-sub pbx-fade">Tell us what you do. Watch three posts write themselves.</p>

          <form
            className="pbx-hero-form pbx-fade"
            onSubmit={onSubmit}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
            }}
          >
            <div className="pbx-chip-row" role="group" aria-label="What kind of business do you run?">
              {DEMO_CATEGORIES.map((cat, i) => {
                const isSelected = selected === cat.id;
                const isIdleSpot = !selected && status === "idle" && !reducedMotion && i === idleIndex;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`pbx-chip${isSelected ? " is-selected" : ""}${isIdleSpot ? " is-previewing" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => pickCategory(cat.id)}
                    disabled={status === "writing"}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="pbx-hero-controls">
              <label className="pbx-name-label" htmlFor="pbx-hero-name">
                <span className="sr-only">Business name (optional)</span>
                <input
                  id="pbx-hero-name"
                  className="pbx-name-input"
                  type="text"
                  value={businessName}
                  maxLength={60}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business name (optional)"
                  disabled={status === "writing"}
                />
              </label>
              <button
                type="submit"
                className="pbx-hero-submit"
                disabled={status === "writing"}
                aria-busy={status === "writing"}
              >
                {buttonLabel}
              </button>
            </div>
          </form>

          <p className="sr-only" role="status">
            {status === "writing"
              ? "Writing your posts."
              : status === "done"
                ? "Three posts drafted. Results are shown beside the form."
                : ""}
          </p>

          <div className="pbx-hero-secondary pbx-fade">
            <Link
              href={SIGNUP_ONBOARDING_URL}
              onClick={() => track("start_trial_clicked", { location: "hero" })}
            >
              Start free trial
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/sign-in">Sign in</Link>
          </div>

          <div className="pbx-hero-trust pbx-fade" aria-label="Built for local businesses">
            {trustItems.map((item) => (
              <Link key={item.slug} href={`/for/${item.slug}`} className="pbx-trust-item">
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="pbx-hero-stage">
          <div
            className="pbx-orbit"
            ref={orbitRef}
            aria-hidden={status === "done" ? true : undefined}
          >
            {featureTiles.map((tile, i) => (
              <figure key={`feature-${i}`} className={`pbx-slot pbx-slot--feature pbx-slot--f${i}`}>
                <FeatureTile
                  src={tile.src}
                  alt={tile.alt}
                  width={220}
                  height={275}
                  priority={i === 0}
                />
                {i === 0 ? (
                  <figcaption className="pbx-slot-tag">{activeCategory.label}</figcaption>
                ) : null}
              </figure>
            ))}
            {AMBIENT_TILES.map((tile, i) => (
              <span key={`ambient-${i}`} className={`pbx-slot pbx-slot--ambient pbx-slot--a${i}`} aria-hidden>
                <Image src={tile.src} alt="" width={110} height={138} className="pbx-tile-img" />
              </span>
            ))}
            {status === "writing" ? (
              <p className="pbx-writing" role="status">
                Writing your posts<span className="pbx-writing-dots" aria-hidden />
              </p>
            ) : null}
          </div>

          <div
            className="pbx-results"
            ref={resultsRef}
            aria-live="polite"
            style={{ display: status === "done" ? undefined : "none" }}
          >
            {result ? (
              <>
                <p className="pbx-results-summary">
                  {result.usedFallback
                    ? `An example week for a ${activeCategory.label.toLowerCase()} — drafted earlier with this same engine.`
                    : result.summary}
                </p>
                {result.posts.map((post, i) => (
                  <article className="pbx-post" key={`${post.day}-${i}`}>
                    <Image
                      src={result.category.resultImage.src}
                      alt={i === 0 ? result.category.resultImage.alt : ""}
                      width={92}
                      height={115}
                      className="pbx-post-img"
                      aria-hidden={i !== 0 ? true : undefined}
                    />
                    <div className="pbx-post-body">
                      <span className="pbx-post-when">
                        {post.day} · {post.time}
                      </span>
                      {i === 0 ? (
                        <>
                          <p className="pbx-post-copy" ref={typedRef} aria-hidden />
                          <p className="sr-only">{post.copy}</p>
                        </>
                      ) : (
                        <p className="pbx-post-copy">{post.copy}</p>
                      )}
                    </div>
                  </article>
                ))}
                <Link
                  href={SIGNUP_ONBOARDING_URL}
                  className="pbx-results-cta"
                  onClick={() => track("start_trial_clicked", { location: "hero_result" })}
                >
                  Start free trial
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <style>{`
        .pbx-hero {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(24px, 5vh, 64px) 0 clamp(40px, 6vh, 72px);
        }
        .pbx-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.52fr) minmax(0, 0.48fr);
          gap: clamp(28px, 4vw, 72px);
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 clamp(20px, 3vw, 48px);
          min-height: min(78svh, 760px);
        }
        .pbx-hero-brand {
          font-family: var(--font-instrument-serif), Georgia, serif;
          font-size: clamp(20px, 1.6vw, 24px);
          margin: 0 0 18px;
          color: var(--ink);
        }
        .pbx-hero-brand em { font-style: italic; }
        .cx .pbx-hero .pbx-hero-title {
          font-family: var(--font-instrument-sans), Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: clamp(38px, 4.6vw, 64px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.04;
          margin: 0 0 18px;
          color: var(--ink);
          max-width: 12ch;
          white-space: normal;
        }
        .pbx-hero-sub {
          font-size: clamp(16px, 1.25vw, 19px);
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 62%, transparent);
          margin: 0 0 26px;
          max-width: 34ch;
        }
        .pbx-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .pbx-chip {
          border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
          background: rgba(255,255,255,0.75);
          color: color-mix(in srgb, var(--ink) 78%, transparent);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease, transform 0.25s ease;
          min-height: 38px;
        }
        .pbx-chip:hover { border-color: color-mix(in srgb, var(--ink) 40%, transparent); color: var(--ink); }
        .pbx-chip.is-previewing { border-color: color-mix(in srgb, var(--red) 55%, transparent); color: var(--ink); }
        .pbx-chip.is-selected {
          background: var(--ink);
          border-color: var(--ink);
          color: #fff;
        }
        .pbx-chip:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .pbx-chip:disabled { opacity: 0.55; cursor: default; }
        .pbx-hero-controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: stretch; }
        .pbx-name-label { flex: 1 1 200px; display: block; }
        .pbx-name-input {
          width: 100%;
          height: 100%;
          min-height: 50px;
          border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
          border-radius: 14px;
          background: rgba(255,255,255,0.85);
          padding: 0 16px;
          font-size: 15px;
          color: var(--ink);
        }
        .pbx-name-input:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .pbx-hero-submit {
          border: 0;
          border-radius: 14px;
          background: var(--red);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          padding: 0 22px;
          min-height: 50px;
          cursor: pointer;
          transition: background 0.25s ease, transform 0.2s ease;
          box-shadow: 0 14px 30px -16px rgba(238,37,50,0.55);
        }
        .pbx-hero-submit:hover { background: #c81e2a; }
        .pbx-hero-submit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .pbx-hero-submit[aria-busy="true"] { opacity: 0.85; cursor: progress; }
        .pbx-hero-secondary {
          display: flex; gap: 10px; align-items: center;
          margin-top: 18px; font-size: 14px; font-weight: 600;
        }
        .pbx-hero-secondary a { color: color-mix(in srgb, var(--ink) 72%, transparent); text-decoration: none; }
        .pbx-hero-secondary a:hover { color: var(--red); }
        .pbx-hero-trust { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 26px; }
        .pbx-trust-item {
          font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
          text-decoration: none;
        }
        .pbx-trust-item:hover { color: var(--red); }

        .pbx-hero-stage { position: relative; min-height: clamp(420px, 52vw, 560px); }
        .pbx-orbit { position: absolute; inset: 0; z-index: 1; }
        .pbx-slot {
          position: absolute;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 26px 60px -30px rgba(20,20,30,0.45);
          background: #e8e3da;
          will-change: transform;
        }
        .pbx-tile-swap { position: relative; display: block; width: 100%; height: 100%; }
        .pbx-tile-img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .pbx-tile-swap .pbx-tile-img { position: absolute; inset: 0; }
        .pbx-tile-img--back { z-index: 0; }
        .pbx-tile-img--front { z-index: 1; animation: pbxTileIn 0.6s ease both; }
        @keyframes pbxTileIn { from { opacity: 0; } to { opacity: 1; } }
        .pbx-slot--feature { width: clamp(150px, 15vw, 210px); aspect-ratio: 4 / 5; }
        .pbx-slot--f0 { left: 4%; top: 6%; z-index: 3; }
        .pbx-slot--f1 { right: 2%; top: 0; z-index: 2; width: clamp(130px, 13vw, 180px); }
        .pbx-slot--f2 { left: 30%; bottom: 4%; z-index: 2; width: clamp(140px, 14vw, 195px); }
        .pbx-slot--ambient { width: clamp(72px, 7vw, 105px); aspect-ratio: 4 / 5; opacity: 0.9; }
        .pbx-slot--a0 { right: 24%; top: 38%; }
        .pbx-slot--a1 { left: 0; bottom: 18%; }
        .pbx-slot--a2 { right: 0; bottom: 10%; }
        .pbx-slot--a3 { left: 38%; top: 12%; z-index: 1; }
        .pbx-slot-tag {
          position: absolute; left: 10px; bottom: 10px;
          background: rgba(20,20,24,0.72); color: #fff;
          font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
          padding: 4px 9px; border-radius: 999px;
          backdrop-filter: blur(6px);
        }
        .pbx-writing {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          z-index: 5;
          background: rgba(255,255,255,0.92);
          border: 1px solid color-mix(in srgb, var(--ink) 10%, transparent);
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 14px; font-weight: 600; color: var(--ink);
          box-shadow: 0 20px 44px -24px rgba(20,20,30,0.4);
          margin: 0;
        }
        .pbx-writing-dots::after {
          content: "";
          animation: pbxDots 1.2s steps(4, end) infinite;
        }
        @keyframes pbxDots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } }

        .cx .pbx-hero .pbx-results {
          position: relative;
          display: flex; flex-direction: column; justify-content: center;
          gap: 12px;
          min-height: clamp(420px, 52vw, 560px);
        }
        .pbx-results-summary {
          margin: 0 0 2px;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.02em;
          color: color-mix(in srgb, var(--ink) 55%, transparent);
        }
        .pbx-post {
          display: flex; gap: 14px; align-items: stretch;
          background: rgba(255,255,255,0.86);
          border: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 20px 44px -30px rgba(20,20,30,0.4);
        }
        .cx .pbx-hero .pbx-post-img {
          border-radius: 10px; object-fit: cover; flex: none;
          width: 72px; height: 90px; max-width: 72px;
        }
        .pbx-post-body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .pbx-post-when {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-post-copy { margin: 0; font-size: 14.5px; line-height: 1.5; color: var(--ink); min-height: 1.4em; }
        .cx .pbx-hero .pbx-results-cta {
          align-self: flex-start;
          margin-top: 6px;
          background: var(--ink); color: #fff;
          border-radius: 12px; padding: 12px 20px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          transition: background 0.25s ease;
          min-height: 44px; display: inline-flex; align-items: center;
        }
        .cx .pbx-hero .pbx-results-cta:hover { background: var(--red); color: #fff; }
        .pbx-results-cta:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }

        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }

        @media (max-width: 900px) {
          .pbx-hero-grid { grid-template-columns: 1fr; min-height: 0; gap: 30px; }
          .pbx-hero-title { max-width: none; }
          .pbx-hero-stage { min-height: 0; }
          .pbx-orbit { position: relative; inset: auto; display: flex; gap: 10px; }
          .pbx-slot { position: relative; inset: auto !important; flex: 1 1 0; }
          .pbx-slot--ambient { display: none; }
          .pbx-slot--feature { width: auto !important; }
          .pbx-results { position: relative; inset: auto; }
          .pbx-writing { position: absolute; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pbx-tile-img--front { animation: none; }
          .pbx-writing-dots::after { content: "..."; animation: none; }
        }
      `}</style>
    </section>
  );
}
