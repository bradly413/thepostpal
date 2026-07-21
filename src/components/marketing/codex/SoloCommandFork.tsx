"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { CONTACT_EMAIL } from "@/lib/site";
import { track } from "@/lib/marketing/track";

gsap.registerPlugin(ScrollTrigger);

const SOLO_HREF = "/sign-in?mode=signup&next=%2Fonboarding%2Fclassic&plan=solo";

/**
 * The fork before pricing: one business (Solo, self-serve) vs multi-location
 * (Command, sales-assisted walkthrough — the verified path today).
 */
export default function SoloCommandFork() {
  const rootRef = useRef<HTMLElement | null>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const root = rootRef.current;
      if (!root) return;
      const bits = root.querySelectorAll(".pbv-fork-col");
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
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: root,
            start: "top 76%",
            end: "bottom 10%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section className="pbv-fork" aria-label="Solo or Command" ref={rootRef}>
      <div className="pbv-fork-inner">
        <div className="pbv-fork-col">
          <p className="pbv-kicker">Solo</p>
          <h2>One business. One clear week.</h2>
          <p className="pbv-fork-copy">
            For owner-operated businesses and small teams: one brand, three social profiles,
            drafts in your voice, a simple approve-and-schedule week.
          </p>
          <Link
            href={SOLO_HREF}
            className="pbv-fork-cta pbv-fork-cta--solid"
            onClick={() => track("pricing_plan_selected", { plan: "solo", location: "fork" })}
          >
            Start Solo free
          </Link>
        </div>

        <div className="pbv-fork-col">
          <p className="pbv-kicker">Command</p>
          <h2>One brand across every location.</h2>
          <p className="pbv-fork-copy">
            For restaurant groups, brokerages, and multi-location teams: central campaigns with
            local detail, per-location calendars, centralized approvals, and rollup visibility.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Command%20walkthrough`}
            className="pbv-fork-cta"
            onClick={() => track("pricing_plan_selected", { plan: "command", location: "fork" })}
          >
            Book a Command walkthrough
          </a>
        </div>
      </div>

      <style>{`
        .pbv-fork {
          --red: #ee2532;
          --ink: #141418;
          padding: clamp(88px, 13vh, 170px) clamp(20px, 3vw, 48px);
          border-top: 1px solid rgba(20, 20, 24, 0.08);
        }
        .pbv-fork-inner {
          max-width: 1080px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(40px, 6vw, 96px);
        }
        .pbv-fork-col:last-child {
          border-left: 1px solid rgba(20, 20, 24, 0.08);
          padding-left: clamp(40px, 6vw, 96px);
        }
        .pbv-fork h2 {
          margin: 0 0 14px;
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.06;
          color: var(--ink);
        }
        .pbv-fork-copy {
          margin: 0 0 26px;
          font-size: 15.5px;
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 60%, transparent);
          max-width: 44ch;
        }
        .pbv-fork-cta {
          display: inline-flex; align-items: center;
          min-height: 50px; padding: 0 26px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
          color: var(--ink);
          font-size: 15px; font-weight: 700;
          text-decoration: none;
          transition: border-color 0.25s ease, color 0.25s ease, background 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.2s ease;
        }
        .pbv-fork-cta:hover { border-color: var(--ink); }
        .pbv-fork-cta:active { transform: scale(0.98); }
        .pbv-fork-cta:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
        .pbv-fork-cta--solid {
          background: var(--red); border-color: var(--red); color: #fff;
        }
        .pbv-fork-cta--solid:hover { background: #c81e2a; border-color: #c81e2a; }
        @media (max-width: 800px) {
          .pbv-fork-inner { grid-template-columns: 1fr; gap: 44px; }
          .pbv-fork-col:last-child {
            border-left: 0; padding-left: 0;
            border-top: 1px solid rgba(20, 20, 24, 0.08);
            padding-top: 44px;
          }
        }
      `}</style>
    </section>
  );
}
