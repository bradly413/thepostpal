"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { useFeedDemo } from "@/components/marketing/codex/useFeedDemo";
import { DEMO_CATEGORIES } from "@/components/marketing/codex/demo-feed";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { track } from "@/lib/marketing/track";
import {
  DEMO_INTAKE_EVENT,
  DEMO_SUBMIT,
  type DemoIntakeDetail,
} from "@/lib/marketing/demo-intake";

gsap.registerPlugin(ScrollTrigger);

// The scripted artifact uses a REAL Studio image and its matching caption —
// assembled on scroll the way the app assembles a post. Labeled as a product
// example; the live try-it below it calls the actual drafting engine.
const ROUGH_NOTE = "pancakes on at 8 this saturday";
const CAPTION =
  "Saturday starts slow around here. Pancakes on at 8. No rush, no reservations. Come hungry.";

/**
 * "Give it the rough version." — one frame assembles rough note → image →
 * caption → scheduled stamp; then the visitor tries it with one choice.
 */
export default function Demonstration() {
  const rootRef = useRef<HTMLElement | null>(null);
  const noteRef = useRef<HTMLSpanElement | null>(null);
  const capRef = useRef<HTMLParagraphElement | null>(null);
  const typedRef = useRef<HTMLParagraphElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const { ready, reducedMotion } = useMarketingScroll();
  const { status, result, submit, retry } = useFeedDemo("hero");
  const [categoryId, setCategoryId] = useState(DEMO_CATEGORIES[0].id);
  const categoryIdRef = useRef(categoryId);
  categoryIdRef.current = categoryId;

  useEffect(() => {
    const onSample = (event: Event) => {
      const detail = (event as CustomEvent<DemoIntakeDetail>).detail ?? {};
      const nextId = detail.category && DEMO_CATEGORIES.some((c) => c.id === detail.category)
        ? detail.category
        : categoryIdRef.current;
      setCategoryId(nextId);
      if (detail.autoStart) {
        window.setTimeout(() => {
          void submit(nextId, "");
        }, 450);
      }
    };
    window.addEventListener(DEMO_INTAKE_EVENT, onSample);
    return () => window.removeEventListener(DEMO_INTAKE_EVENT, onSample);
  }, [submit]);

  // Scripted artifact assembly — the only typewriter moments on the page.
  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const note = noteRef.current;
      const cap = capRef.current;
      if (!note || !cap) return;

      if (reducedMotion) {
        note.textContent = ROUGH_NOTE;
        cap.textContent = CAPTION;
        gsap.set(root.querySelectorAll(".pbv-fade, .pbv-demo-frame, .pbv-demo-stamp"), {
          opacity: 1,
          y: 0,
          scale: 1,
        });
        gsap.set(".pbv-demo-cover", { scaleX: 0 });
        return;
      }

      const typer = (el: HTMLElement, text: string, duration: number) => {
        const o = { n: 0 };
        return gsap.to(o, {
          n: text.length,
          duration,
          ease: "none",
          onUpdate: () => {
            el.textContent = text.slice(0, Math.round(o.n));
          },
        });
      };

      gsap.set(".pbv-demo-cover", { scaleX: 1, transformOrigin: "right center" });

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: root,
          start: "top 70%",
          end: "bottom 10%",
          toggleActions: "play none none reverse",
        },
      });
      tl.fromTo(
        root.querySelectorAll(".pbv-fade"),
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 },
      );
      tl.fromTo(
        ".pbv-demo-frame",
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.7 },
        "-=0.2",
      );
      tl.add(typer(note, ROUGH_NOTE, 0.7), ">-0.2");
      tl.to(".pbv-demo-cover", { scaleX: 0, duration: 0.8, ease: "power2.inOut" }, ">0.05");
      tl.fromTo(
        ".pbv-demo-img",
        { scale: 1.08, filter: "blur(9px)" },
        { scale: 1, filter: "blur(0px)", duration: 0.85 },
        "<",
      );
      tl.add(typer(cap, CAPTION, 1.4), ">-0.25");
      tl.fromTo(
        ".pbv-demo-stamp",
        { autoAlpha: 0, scale: 0.85 },
        { autoAlpha: 1, scale: 1, duration: 0.4 },
        ">-0.1",
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  // Live results: cards in, first caption typed.
  useGSAP(
    () => {
      const results = resultsRef.current;
      if (status !== "done" || !results || !result) return;
      const copy = result.posts[0]?.copy ?? "";
      const typed = typedRef.current;
      if (reducedMotion) {
        gsap.set(results.querySelectorAll(".pbv-demo-post"), { opacity: 1, y: 0 });
        if (typed) typed.textContent = copy;
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo(
        results.querySelectorAll(".pbv-demo-post"),
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 },
      );
      if (typed && copy) {
        const o = { n: 0 };
        tl.to(
          o,
          {
            n: copy.length,
            duration: Math.min(1.2, copy.length * 0.018),
            ease: "none",
            onUpdate: () => {
              typed.textContent = copy.slice(0, Math.round(o.n));
            },
          },
          "-=0.3",
        );
      }
    },
    { scope: rootRef, dependencies: [status, result, reducedMotion] },
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (status === "writing") return;
      if (status === "done") {
        retry();
        return;
      }
      void submit(categoryId, "");
      track("hero_demo_started", { location: "demo_form", category: categoryId });
    },
    [status, retry, submit, categoryId],
  );

  const buttonLabel =
    status === "writing"
      ? "Drafting captions..."
      : status === "done"
        ? "Try another business type"
        : DEMO_SUBMIT;

  return (
    <section className="pbv-demo" id="demo" aria-labelledby="pbv-demo-title" ref={rootRef}>
      <div className="pbv-demo-inner">
        <p className="pbv-kicker pbv-fade">See it work</p>
        <h2 id="pbv-demo-title" className="pbv-fade">
          Auto captions in your voice.
        </h2>
        <p className="pbv-demo-sub pbv-fade">
          Watch a rough note become an approval-ready post — then draft captions for your business type.
        </p>

        <div className="pbv-demo-frame">
          <div className="pbv-demo-frame-inner">
            <p className="pbv-demo-notelabel">
              You said
              <span className="pbv-demo-note">
                <span ref={noteRef} aria-hidden />
                <span className="sr-only">{ROUGH_NOTE}</span>
              </span>
            </p>
            <div className="pbv-demo-media">
              <Image
                src="/hero-ring/01.jpg"
                alt="Brunch spread with pancakes and waffles, generated in Posterboy Studio"
                width={640}
                height={480}
                className="pbv-demo-img"
                sizes="(max-width: 760px) 92vw, 520px"
              />
              <span className="pbv-demo-cover" aria-hidden />
            </div>
            <p className="pbv-demo-cap" ref={capRef} aria-hidden />
            <p className="sr-only">{CAPTION}</p>
            <p className="pbv-demo-stamp">
              <span className="pbv-demo-stamp-dot" aria-hidden /> Approved · Saturday · 8:00 AM
            </p>
          </div>
        </div>
        <p className="pbv-demo-framenote pbv-fade">
          Product example — a real Studio image and caption, assembled the way the app does it.
        </p>

        <form className="pbv-demo-try pbv-fade" onSubmit={onSubmit}>
          <label className="pbv-demo-sentence" htmlFor="pbv-demo-cat">
            <span className="pbv-demo-sentence-text">I run a</span>
            <span className="pbv-demo-selectwrap">
              <select
                id="pbv-demo-cat"
                className="pbv-demo-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  track("category_selected", { category: e.target.value, location: "hero" });
                }}
                disabled={status === "writing"}
              >
                {DEMO_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label.toLowerCase()}
                  </option>
                ))}
              </select>
              <span className="pbv-demo-caret" aria-hidden>
                ▾
              </span>
            </span>
          </label>
          <button
            type="submit"
            className="pbv-btn pbv-demo-btn"
            disabled={status === "writing"}
            aria-busy={status === "writing"}
          >
            {buttonLabel}
          </button>
        </form>

        <p className="sr-only" role="status">
          {status === "writing"
            ? "Writing your posts."
            : status === "done"
              ? "Three posts drafted below."
              : ""}
        </p>

        {status === "done" && result ? (
          <div className="pbv-demo-results" ref={resultsRef} aria-live="polite">
            <p className="pbv-demo-results-note">
              {result.usedFallback
                ? "Example captions — drafted earlier with this same engine."
                : result.summary}
            </p>
            {result.posts.map((post, i) => (
              <article className="pbv-demo-post" key={`${post.day}-${i}`}>
                <span className="pbv-demo-post-when">
                  {post.day} · {post.time}
                </span>
                {i === 0 ? (
                  <>
                    <p className="pbv-demo-post-copy" ref={typedRef} aria-hidden />
                    <p className="sr-only">{post.copy}</p>
                  </>
                ) : (
                  <p className="pbv-demo-post-copy">{post.copy}</p>
                )}
              </article>
            ))}
            <Link
              href={SIGNUP_ONBOARDING_URL}
              className="pbv-link pbv-demo-results-cta"
              onClick={() => track("start_trial_clicked", { location: "demo_result" })}
            >
              Looks right? Start free trial
            </Link>
          </div>
        ) : null}
      </div>

      <style>{`
        .pbv-demo {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(56px, 9vh, 120px) clamp(16px, 2.5vw, 36px);
        }
        .pbv-demo-inner { max-width: 760px; margin: 0 auto; }
        .pbv-demo h2 {
          margin: 0 0 14px;
          font-size: clamp(34px, 4.6vw, 56px);
          font-weight: 750;
          letter-spacing: -0.035em;
          line-height: 1.02;
          color: var(--ink);
        }
        .pbv-demo-sub {
          margin: 0 0 40px;
          font-size: clamp(15.5px, 1.2vw, 18px);
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 60%, transparent);
        }
        .pbv-demo-frame {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(20, 20, 24, 0.06);
          border-radius: 32px;
          padding: 12px;
          box-shadow: 0 28px 70px -44px rgba(20, 20, 40, 0.35);
        }
        .pbv-demo-frame-inner {
          background: #fff;
          border-radius: 22px;
          padding: clamp(18px, 2.5vw, 28px);
        }
        .pbv-demo-notelabel {
          display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
          margin: 0 0 16px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
        }
        .pbv-demo-note {
          font-family: ui-monospace, "Roboto Mono", Menlo, monospace;
          font-size: 14px; font-weight: 400;
          letter-spacing: 0; text-transform: none;
          color: var(--ink);
          min-height: 1.2em;
        }
        .pbv-demo-media {
          position: relative;
          aspect-ratio: 16 / 10;
          border-radius: 12px;
          overflow: hidden;
          background: #ece7de;
        }
        .pbv-demo-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pbv-demo-cover { position: absolute; inset: 0; background: #efeae1; pointer-events: none; }
        .pbv-demo-cap {
          margin: 16px 0 0;
          font-size: clamp(15.5px, 1.25vw, 17.5px);
          line-height: 1.55;
          color: var(--ink);
          min-height: 2.9em;
        }
        .pbv-demo-stamp {
          display: inline-flex; align-items: center; gap: 8px;
          margin: 14px 0 0;
          font-size: 12.5px; font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--ink);
          border: 1px solid rgba(20, 20, 24, 0.12);
          border-radius: 999px;
          padding: 7px 14px;
        }
        .pbv-demo-stamp-dot { width: 8px; height: 8px; border-radius: 50%; background: #1f9d4d; }
        .pbv-demo-framenote {
          margin: 14px 4px 0;
          font-size: 12.5px;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
        }
        .pbv-demo-try {
          display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
          margin-top: 56px;
          padding-top: 40px;
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-demo-sentence {
          display: inline-flex; align-items: baseline; gap: 12px;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--ink);
          cursor: pointer;
        }
        .pbv-demo-selectwrap { position: relative; display: inline-flex; align-items: baseline; }
        .pbv-demo-select {
          appearance: none;
          border: 0;
          background: transparent;
          font: inherit;
          color: var(--red);
          padding: 0 26px 2px 0;
          border-bottom: 3px solid color-mix(in srgb, var(--red) 40%, transparent);
          cursor: pointer;
          max-width: 60vw;
        }
        .pbv-demo-select:focus-visible { outline: 2px solid var(--red); outline-offset: 4px; }
        .pbv-demo-caret {
          position: absolute; right: 2px; bottom: 6px;
          font-size: 0.5em; color: var(--red);
          pointer-events: none;
        }
        .pbv-demo .pbv-btn {
          background: var(--red); color: #fff;
          border: 0; border-radius: 999px;
          padding: 0 28px; min-height: 52px;
          display: inline-flex; align-items: center;
          font-size: 15.5px; font-weight: 700; letter-spacing: 0.01em;
          text-decoration: none; cursor: pointer;
          transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s ease;
        }
        .pbv-demo .pbv-btn:hover:not(:disabled) { background: #c81e2a; }
        .pbv-demo .pbv-btn:active { transform: scale(0.98); }
        .pbv-demo .pbv-btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .pbv-demo .pbv-link {
          color: var(--ink);
          font-size: 15px; font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 5px;
          text-decoration-color: color-mix(in srgb, var(--ink) 30%, transparent);
        }
        .pbv-demo .pbv-link:hover { text-decoration-color: var(--ink); }
        .pbv-demo .pbv-link:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
        .pbv-demo-btn { flex: none; }
        .pbv-demo-btn:disabled { opacity: 0.8; cursor: progress; }
        .pbv-demo-results { margin-top: 34px; display: flex; flex-direction: column; gap: 12px; }
        .pbv-demo-results-note {
          margin: 0 0 2px;
          font-size: 13px; font-weight: 600;
          color: color-mix(in srgb, var(--ink) 52%, transparent);
        }
        .pbv-demo-post {
          background: #fff;
          border: 1px solid rgba(20, 20, 24, 0.08);
          border-radius: 16px;
          padding: 16px 18px;
        }
        .pbv-demo-post-when {
          display: block;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
          margin-bottom: 6px;
        }
        .pbv-demo-post-copy { margin: 0; font-size: 15.5px; line-height: 1.55; color: var(--ink); min-height: 1.4em; }
        .pbv-demo-results-cta { align-self: flex-start; margin-top: 8px; }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        @media (max-width: 640px) {
          .pbv-demo-try { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </section>
  );
}
