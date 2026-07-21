"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

// Step names + one-line descriptions carried over verbatim from the original
// "How it works" walkthrough (source of truth — do not rewrite).
const STEPS = [
  {
    title: "Set your voice",
    badge: "once",
    desc: "A quick setup learns your brand voice and look — so everything that follows sounds like you, not a robot.",
  },
  {
    title: "Connect",
    badge: "2 min",
    desc: "Link your Facebook and Instagram once. Takes about two minutes — then you're set.",
  },
  {
    title: "Create",
    badge: "seconds",
    desc: "Describe a post in a few plain words. Posterboy writes the caption and makes the image, on-brand, in seconds.",
  },
  {
    title: "Schedule",
    badge: "automatic",
    desc: "Pick when it goes out — Posterboy publishes it to Facebook and Instagram for you. Or post it right now.",
  },
  {
    title: "Stay on top",
    badge: "anytime",
    desc: "Every post lives in one simple calendar you can skim anytime. No dashboards to dig through.",
  },
] as const;

/** Steps 3–5 use real product screenshots; 1–2 are product-shaped panels. */
function StepPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="pbx-say-mock" aria-label="Brand voice setup">
        <p className="pbx-say-mock-h">Brand voice</p>
        <dl className="pbx-say-mock-rows">
          <div>
            <dt>Tone</dt>
            <dd>Warm, plainspoken, no hard sell</dd>
          </div>
          <div>
            <dt>Words to avoid</dt>
            <dd>
              <span className="pbx-say-mock-chip">elevate</span>
              <span className="pbx-say-mock-chip">foodie</span>
              <span className="pbx-say-mock-chip">vibes</span>
            </dd>
          </div>
        </dl>
        <p className="pbx-say-mock-note">We learn your voice from your edits, not your prompts.</p>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="pbx-say-mock" aria-label="Connected channels">
        <p className="pbx-say-mock-h">Channels</p>
        <ul className="pbx-say-mock-list">
          <li>
            <span className="pbx-say-mock-ok" aria-hidden /> Facebook Page — connected
          </li>
          <li>
            <span className="pbx-say-mock-ok" aria-hidden /> Instagram — connected
          </li>
        </ul>
        <p className="pbx-say-mock-note">Connect Meta once. Publish from one calm queue.</p>
      </div>
    );
  }
  const shots = [
    {
      src: "/marketing/product-demo/auto-caption/01-writing.jpg",
      alt: "Posterboy composer writing a caption for a queued post",
    },
    {
      src: "/marketing/product-demo/auto-caption/02-first-caption.jpg",
      alt: "Posterboy Schedule page with a drafted post beside the July calendar",
    },
    {
      src: "/marketing/product-demo/bulk-upload/05-queue.jpg",
      alt: "Posterboy bulk queue listing eight scheduled posts",
    },
  ] as const;
  const shot = shots[index - 2];
  return (
    <Image
      src={shot.src}
      alt={shot.alt}
      width={1600}
      height={907}
      className="pbx-say-shot"
      sizes="(max-width: 900px) 92vw, 560px"
    />
  );
}

/**
 * "Say it. It's made." — five-step walkthrough.
 * Desktop: pinned, scrubbed sequence (the ONLY scrubbed section on the page).
 * Mobile / reduced motion: swipeable snap cards, no pinning.
 */
export default function SayItWalkthrough() {
  const rootRef = useRef<HTMLElement | null>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready || reducedMotion) return;
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 901px)", () => {
        const pinEl = root.querySelector<HTMLElement>(".pbx-say-pin");
        const panels = root.querySelectorAll<HTMLElement>(".pbx-say-panel");
        if (!pinEl || panels.length < STEPS.length) return;

        gsap.set(panels, { autoAlpha: 0, xPercent: 6 });
        gsap.set(panels[0], { autoAlpha: 1, xPercent: 0 });

        // One scrubbed timeline drives all five steps.
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinEl,
            start: "top top+=56",
            end: "+=220%",
            pin: true,
            scrub: 1,
            onUpdate(self) {
              const idx = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
              setActive((prev) => (prev === idx ? prev : idx));
            },
          },
        });
        stRef.current = tl.scrollTrigger ?? null;

        for (let i = 1; i < STEPS.length; i++) {
          tl.to(panels[i - 1], { autoAlpha: 0, xPercent: -6, duration: 0.35, ease: "power2.out" }, i);
          tl.to(panels[i], { autoAlpha: 1, xPercent: 0, duration: 0.4, ease: "power2.out" }, i + 0.05);
        }
        tl.to({}, { duration: 0.6 }); // settle room on the last step

        return () => {
          stRef.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  // Arrows + rail: jump the scrubbed sequence to a step (desktop) or slide the
  // card scroller (mobile / reduced motion).
  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
      track("walkthrough_step", { step: clamped + 1, section: "say-it" });
      const st = stRef.current;
      if (st) {
        const target = st.start + ((clamped + 0.55) / STEPS.length) * (st.end - st.start);
        window.scrollTo({ top: target });
        return;
      }
      const scroller = scrollerRef.current;
      if (scroller) {
        const card = scroller.children[clamped] as HTMLElement | undefined;
        card?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          inline: "center",
          block: "nearest",
        });
        setActive(clamped);
      }
    },
    [reducedMotion],
  );

  const cardMode = reducedMotion; // desktop reduced-motion also uses cards

  return (
    <section className="pbx-say" id="how" aria-labelledby="pbx-say-title" ref={rootRef}>
      <div className="pbx-say-pin">
        <div className="pbx-say-head">
          <p className="pbx-say-kicker">How it works</p>
          <h2 id="pbx-say-title">
            Say it. <strong>It&rsquo;s made.</strong>
          </h2>
          <div className="pbx-say-nav">
            <span className="pbx-say-count" aria-live="polite">
              {active + 1} / {STEPS.length}
            </span>
            <button
              type="button"
              className="pbx-say-arrow"
              aria-label="Previous step"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
            >
              ←
            </button>
            <button
              type="button"
              className="pbx-say-arrow"
              aria-label="Next step"
              onClick={() => goTo(active + 1)}
              disabled={active === STEPS.length - 1}
            >
              →
            </button>
          </div>
        </div>

        {/* Desktop: rail + crossfading preview (hidden on mobile via CSS). */}
        <div className={`pbx-say-desk${cardMode ? " pbx-say-desk--static" : ""}`}>
          <ol className="pbx-say-rail">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <button
                  type="button"
                  className={`pbx-say-step${i === active ? " is-active" : ""}${i < active ? " is-done" : ""}`}
                  aria-current={i === active ? "step" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span className="pbx-say-step-top">
                    <span className="pbx-say-step-n">{i + 1}</span>
                    <span className="pbx-say-step-badge">{step.badge}</span>
                  </span>
                  <span className="pbx-say-step-title">{step.title}</span>
                  <span className="pbx-say-step-desc">{step.desc}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="pbx-say-preview">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="pbx-say-panel"
                aria-hidden={cardMode ? undefined : i !== active}
                style={cardMode ? { position: "static", opacity: i === active ? 1 : 0, display: i === active ? "block" : "none" } : undefined}
              >
                <StepPreview index={i} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: swipeable snap cards (hidden on desktop via CSS). */}
        <div className="pbx-say-cards" ref={scrollerRef} aria-label="Product walkthrough steps">
          {STEPS.map((step, i) => (
            <article className="pbx-say-card" key={step.title}>
              <span className="pbx-say-step-top">
                <span className="pbx-say-step-n">{i + 1}</span>
                <span className="pbx-say-step-badge">{step.badge}</span>
              </span>
              <h3 className="pbx-say-step-title">{step.title}</h3>
              <p className="pbx-say-step-desc">{step.desc}</p>
              <div className="pbx-say-card-preview">
                <StepPreview index={i} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .pbx-say {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(64px, 9vh, 110px) clamp(20px, 3vw, 48px);
          max-width: 1240px;
          margin: 0 auto;
        }
        .pbx-say-head {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 18px; flex-wrap: wrap; margin-bottom: 34px;
        }
        .pbx-say-kicker {
          margin: 0 0 12px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-say h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 700; letter-spacing: -0.025em; line-height: 1.05;
          color: var(--ink);
        }
        .pbx-say h2 strong { color: var(--red); }
        .pbx-say-nav { display: flex; align-items: center; gap: 10px; }
        .pbx-say-count {
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
          color: color-mix(in srgb, var(--ink) 55%, transparent);
          font-variant-numeric: tabular-nums;
        }
        .pbx-say-arrow {
          width: 42px; height: 42px; border-radius: 50%;
          border: 1px solid rgba(20,20,24,0.16);
          background: rgba(255,255,255,0.8);
          color: var(--ink); font-size: 17px; cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
        }
        .pbx-say-arrow:hover:not(:disabled) { border-color: var(--red); color: var(--red); }
        .pbx-say-arrow:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .pbx-say-arrow:disabled { opacity: 0.35; cursor: default; }

        .pbx-say-desk {
          display: grid;
          grid-template-columns: minmax(0, 0.42fr) minmax(0, 0.58fr);
          gap: clamp(24px, 3vw, 48px);
          align-items: start;
        }
        .pbx-say-rail { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .pbx-say-step {
          display: flex; flex-direction: column; gap: 6px;
          width: 100%; text-align: left; cursor: pointer;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(20,20,24,0.08);
          border-radius: 16px;
          padding: 14px 16px;
          transition: border-color 0.25s ease, background 0.25s ease, opacity 0.25s ease;
          opacity: 0.62;
        }
        .pbx-say-step:hover { opacity: 0.9; }
        .pbx-say-step:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
        .pbx-say-step.is-active {
          opacity: 1;
          background: rgba(255,255,255,0.92);
          border-color: color-mix(in srgb, var(--red) 45%, transparent);
          box-shadow: 0 18px 40px -28px rgba(20,20,40,0.4);
        }
        .pbx-say-step.is-done { opacity: 0.8; }
        .pbx-say-step-top { display: flex; align-items: center; justify-content: space-between; }
        .pbx-say-step-n {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--red); color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
        }
        .pbx-say-step.is-done .pbx-say-step-n { background: color-mix(in srgb, var(--ink) 55%, transparent); }
        .pbx-say-step-badge {
          font-size: 10.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
          border: 1px solid rgba(20,20,24,0.12);
          border-radius: 999px; padding: 3px 9px;
        }
        .pbx-say-step-title { font-size: 17px; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
        .pbx-say-step-desc { font-size: 13.5px; line-height: 1.5; color: color-mix(in srgb, var(--ink) 62%, transparent); }

        .pbx-say-preview { position: relative; min-height: clamp(320px, 30vw, 430px); }
        .pbx-say-panel { position: absolute; inset: 0; will-change: transform, opacity; }
        .pbx-say-shot {
          width: 100%; height: 100%; object-fit: cover; object-position: top left;
          border-radius: 18px;
          border: 1px solid rgba(20,20,24,0.1);
          box-shadow: 0 30px 70px -38px rgba(20,25,40,0.5);
        }
        .pbx-say-mock {
          height: 100%;
          display: flex; flex-direction: column; justify-content: center; gap: 16px;
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(20,20,24,0.1);
          border-radius: 18px;
          padding: clamp(22px, 3vw, 40px);
          box-shadow: 0 30px 70px -38px rgba(20,25,40,0.5);
        }
        .pbx-say-mock-h {
          margin: 0;
          font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--red);
        }
        .pbx-say-mock-rows { margin: 0; display: flex; flex-direction: column; gap: 14px; }
        .pbx-say-mock-rows dt {
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
          margin-bottom: 4px;
        }
        .pbx-say-mock-rows dd { margin: 0; font-size: 16px; color: var(--ink); display: flex; gap: 6px; flex-wrap: wrap; }
        .pbx-say-mock-chip {
          font-size: 13px; border: 1px solid rgba(20,20,24,0.14); border-radius: 999px;
          padding: 4px 11px; color: color-mix(in srgb, var(--ink) 70%, transparent);
          text-decoration: line-through;
        }
        .pbx-say-mock-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; font-size: 16px; color: var(--ink); }
        .pbx-say-mock-list li { display: flex; align-items: center; gap: 10px; }
        .pbx-say-mock-ok { width: 9px; height: 9px; border-radius: 50%; background: #1f9d4d; flex: none; }
        .pbx-say-mock-note { margin: 0; font-size: 13.5px; color: color-mix(in srgb, var(--ink) 55%, transparent); }

        .pbx-say-cards { display: none; }

        /* Short desktop viewports: the pinned rail must fit on screen —
           collapse descriptions on inactive steps. */
        @media (min-width: 901px) and (max-height: 860px) {
          .pbx-say-step:not(.is-active) .pbx-say-step-desc { display: none; }
          .pbx-say-step { padding: 11px 14px; }
          .pbx-say-head { margin-bottom: 22px; }
        }

        @media (max-width: 900px) {
          .pbx-say-desk { display: none; }
          .pbx-say-cards {
            display: flex; gap: 14px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            padding: 4px 2px 18px;
            scrollbar-width: none;
          }
          .pbx-say-cards::-webkit-scrollbar { display: none; }
          .pbx-say-card {
            flex: 0 0 86%;
            scroll-snap-align: center;
            background: rgba(255,255,255,0.86);
            border: 1px solid rgba(20,20,24,0.1);
            border-radius: 18px;
            padding: 18px;
            display: flex; flex-direction: column; gap: 8px;
          }
          .pbx-say-card .pbx-say-step-title { margin: 0; font-size: 19px; }
          .pbx-say-card .pbx-say-step-desc { margin: 0; }
          .pbx-say-card-preview { margin-top: 12px; }
          .pbx-say-card-preview .pbx-say-shot { height: auto; }
          .pbx-say-card-preview .pbx-say-mock { box-shadow: none; }
        }
        @media (min-width: 901px) {
          .pbx-say-desk--static + .pbx-say-cards { display: none; }
        }
      `}</style>
    </section>
  );
}
