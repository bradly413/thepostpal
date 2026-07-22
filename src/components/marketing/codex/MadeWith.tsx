"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { DEMO_CATEGORIES, getDemoCategory } from "@/components/marketing/codex/demo-feed";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

/** Priority verticals for the examples gallery (plan: restaurant, wellness, realtor). */
const GALLERY_IDS = ["restaurant", "salon", "real-estate"] as const;
const GALLERY = GALLERY_IDS.map((id) => getDemoCategory(id));

/**
 * Category examples gallery — sample posts per vertical, labeled as product demos.
 */
export default function MadeWith() {
  const rootRef = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const [active, setActive] = useState(0);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-mw-panelwrap");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        bits,
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.1,
          ease: "power2.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: root,
            start: "top 74%",
            end: "bottom 10%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reducedMotion) return;
      const panel = root.querySelector(".pbv-mw-panel");
      if (!panel) return;
      gsap.fromTo(panel, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" });
    },
    { scope: rootRef, dependencies: [active, reducedMotion] },
  );

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (active + 1) % GALLERY.length
        : (active - 1 + GALLERY.length) % GALLERY.length;
    setActive(next);
    const btn = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    btn?.focus();
  };

  const cat = GALLERY[active] ?? DEMO_CATEGORIES[0];

  return (
    <section className="pbv-mw" id="examples" aria-labelledby="pbv-mw-title" ref={rootRef}>
      <div className="pbv-mw-inner">
        <p className="pbv-kicker pbv-fade">Made with Posterboy</p>
        <h2 id="pbv-mw-title" className="pbv-fade">
          Built around the business. Not a template pack.
        </h2>
        <p className="pbv-mw-note pbv-fade">
          Product sample captions in the Posterboy voice — not customer campaigns.
        </p>

        <div className="pbv-mw-tabs pbv-fade" role="tablist" aria-label="Business types">
          {GALLERY.map((c, i) => (
            <button
              key={c.id}
              role="tab"
              id={`${baseId}-tab-${c.id}`}
              aria-selected={i === active}
              aria-controls={`${baseId}-panel-${c.id}`}
              tabIndex={i === active ? 0 : -1}
              className={`pbv-mw-tab${i === active ? " is-active" : ""}`}
              onClick={() => {
                setActive(i);
                track("category_example_selected", { tab: c.id, section: "made-with" });
                track("case_study_tab_selected", { tab: c.id, section: "made-with" });
              }}
              onKeyDown={onTabKey}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="pbv-mw-panelwrap">
          <div
            className="pbv-mw-panel"
            role="tabpanel"
            id={`${baseId}-panel-${cat.id}`}
            aria-labelledby={`${baseId}-tab-${cat.id}`}
          >
            <div className="pbv-mw-week">
              {cat.fallback.posts.map((post, i) => (
                <article className="pbv-mw-post" key={`${cat.id}-${post.day}-${i}`}>
                  {i === 0 ? (
                    <Image
                      src={cat.resultImage.src}
                      alt={cat.resultImage.alt}
                      width={520}
                      height={340}
                      className="pbv-mw-post-img"
                      sizes="(max-width: 760px) 92vw, 300px"
                    />
                  ) : null}
                  <div className="pbv-mw-post-body">
                    <span className="pbv-mw-post-when">
                      {post.day} · {post.time} · Facebook + Instagram
                    </span>
                    <p className="pbv-mw-post-copy">{post.copy}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="pbv-mw-summary">{cat.fallback.summary}</p>
          </div>
        </div>
      </div>

      <style>{`
        .pbv-mw {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(88px, 13vh, 170px) clamp(20px, 3vw, 48px);
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-mw-inner { max-width: 1080px; margin: 0 auto; }
        .pbv-mw h2 {
          margin: 0 0 10px;
          font-size: clamp(34px, 4.6vw, 56px);
          font-weight: 700;
          letter-spacing: -0.035em;
          line-height: 1.02;
          color: var(--ink);
        }
        .pbv-mw-note {
          margin: 0 0 30px;
          font-size: 13px; font-weight: 600;
          color: color-mix(in srgb, var(--ink) 48%, transparent);
        }
        .pbv-mw-tabs { display: flex; gap: 2px 22px; flex-wrap: wrap; margin-bottom: 30px; }
        .pbv-mw-tab {
          border: 0; background: none; padding: 8px 0;
          font-size: 15px; font-weight: 600;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
          border-bottom: 2px solid transparent;
          cursor: pointer;
          min-height: 42px;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .pbv-mw-tab:hover { color: var(--ink); }
        .pbv-mw-tab.is-active { color: var(--ink); border-bottom-color: var(--red); }
        .pbv-mw-tab:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
        .pbv-mw-week {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }
        .pbv-mw-post {
          background: #fff;
          border: 1px solid rgba(20, 20, 24, 0.08);
          border-radius: 18px;
          overflow: hidden;
          display: flex; flex-direction: column;
        }
        .pbv-mw-post-img { width: 100%; height: 140px; object-fit: cover; display: block; }
        .pbv-mw-post-body { padding: 14px 14px 16px; }
        .pbv-mw-post-when {
          display: block;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 45%, transparent);
          margin-bottom: 7px;
        }
        .pbv-mw-post-copy { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--ink); }
        .pbv-mw-summary {
          margin: 18px 2px 0;
          font-size: 13.5px;
          color: color-mix(in srgb, var(--ink) 52%, transparent);
        }
        @media (max-width: 1100px) {
          .pbv-mw-week { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 860px) {
          .pbv-mw-week { grid-template-columns: 1fr; }
          .pbv-mw-post-img { height: 200px; }
        }
      `}</style>
    </section>
  );
}
