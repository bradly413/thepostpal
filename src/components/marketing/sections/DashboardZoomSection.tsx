"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

const KICKER = "The creator studio";
const HEADLINE = "A quick photo. A finished post.";
const LEDE =
  "Drop a snapshot from your phone. Posterboy reads it, writes the caption in your voice, and styles it to your brand — a scroll-stopping post, without a photographer or a designer.";

const POINTS = [
  "Turns a quick phone photo into a polished post",
  "Writes the caption for you, in your voice",
  "Styled to match your brand",
];

const CALLOUTS = ["Read your photo", "Matched your colors", "Wrote the caption"];

// Real range — one studio, every kind of business.
const BUSINESSES = [
  { key: "florist", label: "Florist", src: "/images/social-mocks/02.png" },
  { key: "landscaping", label: "Landscaping", src: "/images/social-mocks/01.png" },
  { key: "services", label: "Home services", src: "/images/social-mocks/03.png" },
  { key: "creator", label: "Creators", src: "/images/social-mocks/05.png" },
];

const CYCLE_MS = 4200;

/**
 * AI Creator Studio — the trash-to-treasure pitch, shown off. A business
 * switcher auto-cycles through finished posts with a blur→sharp "generating"
 * reveal, so the studio looks like it's composing for any kind of business.
 * Calm by default: pauses on hover, stops on interaction, static for reduced
 * motion. Copy uses the shared [data-reveal] system.
 */
export default function DashboardZoomSection() {
  const { reducedMotion } = useMarketingScroll();
  const [active, setActive] = useState(0);
  const [generating, setGenerating] = useState(false);

  const activeRef = useRef(0);
  activeRef.current = active;
  const userActedRef = useRef(false);
  const hoverRef = useRef(false);
  const shotRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const goTo = (i: number) => {
    if (i === activeRef.current) return;
    if (reducedMotion) {
      setActive(i);
      return;
    }
    clearTimers();
    setGenerating(true);
    timers.current.push(window.setTimeout(() => setActive(i), 210));
    timers.current.push(window.setTimeout(() => setGenerating(false), 430));
  };

  // Preload all posts so switches never flash.
  useEffect(() => {
    BUSINESSES.forEach((b) => {
      const im = new window.Image();
      im.src = b.src;
    });
  }, []);

  // Auto-cycle only while the card is on screen, the user hasn't taken over,
  // and motion is allowed.
  useEffect(() => {
    if (reducedMotion) return;
    const el = shotRef.current;
    if (!el) return;

    let interval: number | null = null;
    const start = () => {
      if (interval != null) return;
      interval = window.setInterval(() => {
        if (hoverRef.current || userActedRef.current) return;
        goTo((activeRef.current + 1) % BUSINESSES.length);
      }, CYCLE_MS);
    };
    const stop = () => {
      if (interval != null) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.35 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      stop();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const onPick = (i: number) => {
    userActedRef.current = true;
    goTo(i);
  };

  const current = BUSINESSES[active];

  return (
    <section
      id="studio"
      className="pb-dash-zoom"
      aria-label="The Posterboy creator studio — turn a phone photo into a finished post"
    >
      <div className="pb-dash-zoom-stage">
        <div className="pb-dash-zoom-copy">
          <p className="pb-dash-zoom-kicker studio-kicker" data-reveal="up-sm">{KICKER}</p>
          <h2 className="pb-dash-zoom-headline type-display" data-reveal>{HEADLINE}</h2>
          <p className="pb-dash-zoom-lede" data-reveal>{LEDE}</p>
          <ul className="studio-points">
            {POINTS.map((p) => (
              <li key={p} data-reveal="up-sm">{p}</li>
            ))}
          </ul>
        </div>

        <div className="pb-dash-zoom-canvas">
          <div className="studio-card" data-reveal="up-lg">
            <div
              ref={shotRef}
              className={`studio-shot${generating ? " is-generating" : ""}`}
              onMouseEnter={() => (hoverRef.current = true)}
              onMouseLeave={() => (hoverRef.current = false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="studio-post"
                src={current.src}
                alt={`A finished ${current.label.toLowerCase()} post made by Posterboy`}
                loading="lazy"
                decoding="async"
                onLoad={() => scheduleMarketingScrollRefresh(100)}
              />
              <span className="studio-spark" aria-hidden>
                <Sparkles size={16} strokeWidth={1.75} />
              </span>
              <span className="studio-genchip" aria-hidden>
                <Sparkles size={12} strokeWidth={2} /> Generating…
              </span>
            </div>

            <div className="studio-cap">
              <span className="studio-cap-spark" aria-hidden>
                <Sparkles size={15} strokeWidth={1.75} />
              </span>
              <span>
                <span className="studio-cap-label">Made by Posterboy</span> from a single photo —
                in {current.label}&apos;s voice.
              </span>
            </div>

            <div className="studio-pills" role="tablist" aria-label="Kind of business">
              {BUSINESSES.map((b, i) => (
                <button
                  key={b.key}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={`studio-pill${i === active ? " is-on" : ""}`}
                  onClick={() => onPick(i)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pb-marketing-site #studio { --pb-red: #ee2532; }
        .pb-marketing-site .studio-kicker { color: var(--pb-red); }
        .pb-marketing-site .studio-points {
          list-style: none; margin: 1.4em 0 0; padding: 0;
          display: flex; flex-direction: column; gap: 9px;
        }
        .pb-marketing-site .studio-points li {
          position: relative; padding-left: 22px;
          font-size: 14.5px; line-height: 1.5;
          color: color-mix(in srgb, var(--ink) 72%, transparent);
        }
        .pb-marketing-site .studio-points li::before {
          content: ""; position: absolute; left: 3px; top: 0.55em;
          width: 6px; height: 6px; border-radius: 50%; background: var(--pb-red);
        }

        .pb-marketing-site .studio-card {
          width: 100%; max-width: clamp(340px, 36vw, 460px); margin: 0 auto;
          background: var(--white); border: 1px solid var(--newsprint);
          border-radius: 22px; overflow: hidden;
          box-shadow: 0 28px 64px -34px rgba(15,15,20,0.32), 0 8px 20px -14px rgba(15,15,20,0.14);
        }
        .pb-marketing-site .studio-shot { position: relative; overflow: hidden; }
        .pb-marketing-site .studio-post {
          display: block; width: 100%; height: auto; vertical-align: top;
          transition: filter 0.45s ease, opacity 0.45s ease, transform 0.45s ease;
        }
        .pb-marketing-site .studio-shot.is-generating .studio-post {
          filter: blur(13px) brightness(1.08) saturate(1.1);
          opacity: 0.55; transform: scale(1.04);
        }
        .pb-marketing-site .studio-spark {
          position: absolute; top: 14px; right: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--pb-red); color: var(--white);
          box-shadow: 0 8px 20px -8px rgba(238,37,50,0.7);
        }
        .pb-marketing-site .studio-genchip {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%) scale(0.96);
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
          color: var(--pb-red); background: rgba(255,255,255,0.92);
          border: 1px solid var(--newsprint); border-radius: 999px;
          padding: 6px 12px; opacity: 0; pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .pb-marketing-site .studio-shot.is-generating .studio-genchip {
          opacity: 1; transform: translate(-50%,-50%) scale(1);
        }
        .pb-marketing-site .studio-cap {
          display: flex; gap: 9px; padding: 13px 16px;
          border-top: 1px solid var(--newsprint);
          font-size: 13.5px; line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 72%, transparent);
        }
        .pb-marketing-site .studio-cap-spark { flex: none; color: var(--pb-red); display: inline-flex; margin-top: 1px; }
        .pb-marketing-site .studio-cap-label { font-weight: 600; color: var(--pb-red); }
        .pb-marketing-site .studio-pills {
          display: flex; flex-wrap: wrap; gap: 7px; padding: 0 16px 16px;
        }
        .pb-marketing-site .studio-pill {
          font-size: 12.5px; padding: 6px 12px; border-radius: 999px;
          border: 1px solid var(--newsprint); background: transparent;
          color: var(--quiet-sage); cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
        }
        .pb-marketing-site .studio-pill:hover { border-color: color-mix(in srgb, var(--pb-red) 45%, var(--newsprint)); color: var(--ink); }
        .pb-marketing-site .studio-pill.is-on { background: var(--ink); border-color: var(--ink); color: var(--paper); }
      `}</style>
    </section>
  );
}
