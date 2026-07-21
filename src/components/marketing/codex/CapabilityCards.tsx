"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

/**
 * TRC StickyServiceCards interaction + markup, Posterboy product copy/assets.
 * CSS: sticky-service-cards.css (copied from TRC).
 */

type Card = {
  n: string;
  id: string;
  label: string;
  title: string;
  outcome: string;
  bullets: string[];
  img: string;
  layout?: "cover" | "invert" | "default";
  href: string;
  cta: string;
};

const CARDS: Card[] = [
  {
    n: "01",
    id: "studio",
    label: "Studio",
    title: "Make the post without becoming a designer.",
    outcome: "Describe the post. Posterboy drafts an on-brand image ready to schedule.",
    bullets: [
      "Studio for social crops (Reels, feed, stories)",
      "Brand-safe looks - not stock mush",
      "Save to your library and calendar",
    ],
    img: "/marketing/capabilities/cap-studio.jpg",
    layout: "cover",
    href: SIGNUP_ONBOARDING_URL,
    cta: "Try Studio",
  },
  {
    n: "02",
    id: "captions",
    label: "Captions",
    title: "Sound like you - not like a content calendar.",
    outcome: "Captions match your voice. Edit once; we learn from what you keep.",
    bullets: [
      "Voice trained on your brand",
      "Options when you want them - never forced",
      "Hashtags and CTAs that fit the platform",
    ],
    // Finished feed post = caption outcome (real social mock, not stock filler)
    img: "/images/social-mocks/05.png",
    layout: "invert",
    href: SIGNUP_ONBOARDING_URL,
    cta: "Draft a caption",
  },
  {
    n: "03",
    id: "schedule",
    label: "Schedule",
    title: "Your week lands on the calendar.",
    outcome: "Approve at your leisure. Posterboy queues posts so the feed stays alive.",
    bullets: [
      "Visual calendar for the week ahead",
      "Bulk upload when you have a folder of assets",
      "Quiet reminders - not a hustle dashboard",
    ],
    // Real product UI (dashboard) for the schedule beat
    img: "/images/posterboy-dashboard-zoom.png",
    href: "/#pricing",
    cta: "See pricing",
  },
  {
    n: "04",
    id: "publish",
    label: "Publish",
    title: "Facebook and Instagram without the tab shuffle.",
    outcome: "Connect Meta once. Schedule and publish from one calm workspace.",
    bullets: [
      "Facebook + Instagram from the same post",
      "Failed publishes surface with retry",
      "Command adds approvals for multi-location teams",
    ],
    // Story mock = published surface
    img: "/images/social-mocks/04.png",
    layout: "invert",
    href: SIGNUP_ONBOARDING_URL,
    cta: "Start free trial",
  },
];

const ENTRANCE_BITS =
  ".ssc-card__seq, .ssc-card__n, .ssc-card__label, .ssc-card__title, .ssc-card__outcome, .ssc-card__bullets li, .ssc-card__proof, .ssc-card__link";

export default function CapabilityCards() {
  const root = useRef<HTMLDivElement | null>(null);
  const indexRef = useRef<HTMLOListElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const wrap = root.current;
    if (!wrap) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = [...wrap.querySelectorAll<HTMLElement>(".ssc-card")];
      const total = cards.length;

      cards.forEach((el, i) => {
        const enterStart = () => {
          const slot = el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom);
          const base = wrap.getBoundingClientRect().top + window.scrollY;
          return base + i * slot - window.innerHeight * 0.82;
        };
        const bits = el.querySelectorAll(ENTRANCE_BITS);

        gsap.set(el, { y: 54, opacity: 0, scale: 0.94, transformOrigin: "50% 100%" });
        gsap.set(bits, { y: 18, opacity: 0 });
        gsap
          .timeline({
            scrollTrigger: {
              trigger: wrap,
              start: enterStart,
              once: true,
              invalidateOnRefresh: true,
            },
          })
          .to(el, { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" })
          .to(bits, { y: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: "power3.out" }, "-=0.5");
      });

      cards.forEach((el, i) => {
        if (i === total - 1) return;

        const cardStart = () => {
          const slot = el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom);
          const base = wrap.getBoundingClientRect().top + window.scrollY;
          return base + i * slot - window.innerHeight * 0.08;
        };

        gsap
          .timeline({
            scrollTrigger: {
              trigger: wrap,
              start: cardStart,
              end: () => cardStart() + window.innerHeight * 0.92,
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          .to(
            el,
            {
              ease: "none",
              startAt: { scale: 1 },
              scale: 0.97,
            },
            0,
          );
      });

      ScrollTrigger.refresh();
    });

    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === "complete") {
      requestAnimationFrame(refresh);
    } else {
      window.addEventListener("load", refresh, { once: true });
    }

    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  useEffect(() => {
    const wrap = root.current;
    const index = indexRef.current;
    if (!wrap || !index) return;
    const cards = [...wrap.querySelectorAll<HTMLElement>(".ssc-card")];
    const nums = [...index.querySelectorAll(".ssc-index__n")];
    if (!nums.length) return;

    const vis = new IntersectionObserver(
      ([e]) => index.classList.toggle("is-visible", e.isIntersecting),
      { rootMargin: "-10% 0px -48% 0px" },
    );
    vis.observe(wrap);

    let raf = 0;
    const setActive = () => {
      raf = 0;
      const first = cards[0];
      if (!first) return;
      const slot = first.offsetHeight + parseFloat(getComputedStyle(first).marginBottom);
      const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      const line = window.scrollY + window.innerHeight * 0.42;
      let i = Math.floor((line - wrapTop) / slot);
      i = Math.max(0, Math.min(cards.length - 1, i));
      nums.forEach((n, k) => n.classList.toggle("is-active", k === i));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(setActive);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    setActive();

    return () => {
      vis.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mounted]);

  return (
    <>
      <div className="ssc" ref={root}>
        {CARDS.map((c) => (
          <div
            className={`ssc-card${c.layout && c.layout !== "default" ? ` ssc-card--${c.layout}` : ""}`}
            data-id={c.id}
            key={c.n}
          >
            <div className="ssc-card__text">
              <p className="ssc-card__kicker">
                <span className="ssc-card__n">{c.n}</span>
                <span className="ssc-card__label">{c.label}</span>
              </p>
              <h3 className="ssc-card__title">{c.title}</h3>
              <p className="ssc-card__outcome">{c.outcome}</p>
              <ul className="ssc-card__bullets">
                {c.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Link className="ssc-card__link" href={c.href}>
                {c.cta} <i aria-hidden="true">›</i>
              </Link>
            </div>
            <div className="ssc-card__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ssc-card__img" src={c.img} alt="" loading="lazy" decoding="async" />
            </div>
          </div>
        ))}
      </div>
      {mounted &&
        createPortal(
          <ol className="ssc-index" ref={indexRef} aria-hidden="true">
            {CARDS.map((c) => (
              <li className="ssc-index__n" key={c.n}>
                {c.n}
              </li>
            ))}
          </ol>,
          document.body,
        )}
    </>
  );
}
