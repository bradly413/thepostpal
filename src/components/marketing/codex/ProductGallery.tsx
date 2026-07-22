"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { goToDemo, PRIMARY_CTA } from "@/lib/marketing/demo-intake";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  {
    id: "studio",
    title: "Creator Studio",
    body: "Make on-brand images and video ready for the calendar.",
    img: "/marketing/capabilities/cap-studio.jpg",
    tone: "warm",
  },
  {
    id: "captions",
    title: "Auto captions",
    body: "Bulk captions in your voice — not content-calendar speak.",
    img: "/marketing/capabilities/cap-captions.jpg",
    tone: "rose",
  },
  {
    id: "schedule",
    title: "Bulk schedule",
    body: "Fill a month out — or further. Schedule as far as you want.",
    img: "/marketing/capabilities/cap-schedule.jpg",
    tone: "sand",
  },
  {
    id: "publish",
    title: "One-click publish",
    body: "Facebook + Instagram from one approved post.",
    img: "/marketing/capabilities/cap-publish.jpg",
    tone: "ink",
  },
] as const;

/**
 * Jitter-style soft floating panel with product capability cards.
 */
export default function ProductGallery() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fade, .pbv-gal-card");
      if (reducedMotion) {
        gsap.set(bits, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        bits,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-gal" aria-labelledby="pbv-gal-title" ref={rootRef}>
      <div className="pbv-gal-shell">
        <div className="pbv-gal-head pbv-fade">
          <p className="pbv-gal-kicker">What you get</p>
          <h2 id="pbv-gal-title">
            Create, caption,
            <br />
            schedule, publish.
          </h2>
        </div>

        <div className="pbv-gal-grid">
          {CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`pbv-gal-card is-${card.tone}`}
              onClick={() => {
                track("hero_demo_started", { location: "gallery", category: card.id });
                goToDemo();
              }}
            >
              <div className="pbv-gal-media">
                <Image
                  src={card.img}
                  alt=""
                  width={640}
                  height={800}
                  className="pbv-gal-img"
                />
              </div>
              <div className="pbv-gal-copy">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <span className="pbv-gal-more">{PRIMARY_CTA} →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .pbv-gal {
          --ink: #141418;
          --red: #ee2532;
          padding: 0 clamp(16px, 2.5vw, 36px) clamp(48px, 8vh, 88px);
        }
        .pbv-gal-shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(28px, 4vw, 44px);
          border-radius: clamp(28px, 3vw, 40px);
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(20, 20, 24, 0.06);
          box-shadow:
            0 30px 80px -48px rgba(20, 20, 40, 0.35),
            0 1px 0 rgba(255, 255, 255, 0.7) inset;
          backdrop-filter: blur(12px);
        }
        .pbv-gal-head { margin-bottom: clamp(22px, 3vw, 36px); }
        .pbv-gal-kicker {
          margin: 0 0 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--ink) 42%, transparent);
        }
        .pbv-gal-head h2 {
          margin: 0;
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 750;
          letter-spacing: -0.035em;
          line-height: 1.05;
          color: var(--ink);
        }
        .pbv-gal-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .pbv-gal-card {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          width: 100%;
          text-align: left;
          border-radius: 24px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          border: 1px solid rgba(20, 20, 24, 0.06);
          padding: 0;
          cursor: pointer;
          font: inherit;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .pbv-gal-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 48px -28px rgba(20, 20, 40, 0.4);
        }
        .pbv-gal-card.is-warm { background: #f3ebe3; }
        .pbv-gal-card.is-rose { background: #f6e8ea; }
        .pbv-gal-card.is-sand { background: #efece4; }
        .pbv-gal-card.is-ink { background: #e8eaee; }
        .pbv-gal-media {
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: rgba(20, 20, 24, 0.04);
        }
        .pbv-gal-img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pbv-gal-copy {
          padding: 16px 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .pbv-gal-copy h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 750;
          letter-spacing: -0.02em;
        }
        .pbv-gal-copy p {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: color-mix(in srgb, var(--ink) 58%, transparent);
          flex: 1;
        }
        .pbv-gal-more {
          margin-top: 8px;
          font-size: 12.5px;
          font-weight: 650;
          color: var(--red);
        }
        @media (max-width: 980px) {
          .pbv-gal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .pbv-gal-grid { grid-template-columns: 1fr; }
          .pbv-gal-media { aspect-ratio: 16 / 10; }
        }
      `}</style>
    </section>
  );
}
