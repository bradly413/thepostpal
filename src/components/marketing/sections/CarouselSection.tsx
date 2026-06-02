"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CAROUSEL_IMAGES } from "@/lib/marketing-images";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

gsap.registerPlugin(ScrollTrigger);

const CARDS = [
  {
    src: CAROUSEL_IMAGES[0],
    kicker: "The draft",
    title: "The post exists. It just never leaves your camera roll.",
    body: "You have the photo. You know the update. Packaging it for every platform is what stalls.",
  },
  {
    src: CAROUSEL_IMAGES[1],
    kicker: "The calendar",
    title: "You remember social only after the week is already full.",
    body: "By the time you sit down to post, the window has passed and the caption gets punted again.",
  },
  {
    src: CAROUSEL_IMAGES[2],
    kicker: "The voice",
    title: "The generic caption is worse than saying nothing.",
    body: "Most tools can produce words. Very few sound like your business when someone actually reads them.",
  },
  {
    src: CAROUSEL_IMAGES[3],
    kicker: "The approval",
    title: "One missing detail can keep a post sitting in limbo all week.",
    body: "Hours, addresses, offers, and photos all need a final look before you let anything go live.",
  },
  {
    src: CAROUSEL_IMAGES[4],
    kicker: "The consistency",
    title: "The feed goes quiet the second real work gets busy.",
    body: "Not because you do not care. Because social becomes the first thing cut when the day gets crowded.",
  },
  {
    src: CAROUSEL_IMAGES[5],
    kicker: "The handoff",
    title: "Hiring help often creates another layer to manage.",
    body: "Now there is a freelancer, a Slack thread, and still nobody has actually scheduled the post.",
  },
] as const;
const CARD_GAP = 40;

export default function CarouselSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const section = sectionRef.current;
      const wrap = wrapRef.current;
      const track = trackRef.current;
      if (!section || !wrap || !track) return;

      const cards = cardsRef.current.filter(Boolean);
      if (cards.length === 0) return;

      const getMaxScroll = () => {
        const viewportW = wrap.offsetWidth;
        const trackW = track.scrollWidth;
        return Math.max(trackW - viewportW, 0);
      };

      const isCompactViewport = () => wrap.offsetWidth < 640;

      const resetCarousel = () => {
        gsap.set(track, { x: 0 });
        const compact = isCompactViewport();
        cards.forEach((card, i) => {
          gsap.set(card, {
            scale: i === 0 ? 1 : 0.92,
            opacity: i === 0 ? 1 : 0.65,
            rotateY: 0,
            z: 0,
            filter: compact
              ? i === 0
                ? "brightness(1)"
                : "brightness(0.92)"
              : i === 0
                ? "brightness(1)"
                : "brightness(0.85) blur(1px)",
          });
        });
        activeIndexRef.current = 0;
        setActiveIndex(0);
      };

      const highlightCard = (progress: number) => {
        const max = getMaxScroll();
        const scrollX = progress * max;
        const cardStep = cards[0].offsetWidth + CARD_GAP;
        const idx = cardStep > 0 ? Math.round(scrollX / cardStep) : 0;
        const clamped = Math.min(Math.max(idx, 0), cards.length - 1);

        if (clamped !== activeIndexRef.current) {
          activeIndexRef.current = clamped;
          setActiveIndex(clamped);
        }

        cards.forEach((card, i) => {
          const dist = Math.abs(i - clamped);
          const on = dist === 0;
          const near = dist === 1;
          const compact = isCompactViewport();
          gsap.set(card, {
            scale: on ? 1.04 : near ? 0.97 : compact ? 0.94 : 0.9,
            opacity: on ? 1 : near ? 0.82 : compact ? 0.7 : 0.58,
            rotateY: compact ? 0 : on ? 0 : i < clamped ? 14 : -14,
            z: on ? 40 : -30,
            filter: compact
              ? on
                ? "brightness(1.02)"
                : near
                  ? "brightness(0.94)"
                  : "brightness(0.88)"
              : on
                ? "brightness(1.05) blur(0px)"
                : "brightness(0.82) blur(1px)",
          });
        });
      };

      if (reducedMotion) {
        section.style.minHeight = "0px";
        resetCarousel();
        return;
      }

      if (isCompactViewport()) {
        section.style.minHeight = "0px";
        resetCarousel();
        return;
      }

      resetCarousel();

      const distance = Math.max(getMaxScroll(), wrap.offsetWidth * 0.35);
      section.style.minHeight = `${distance + window.innerHeight}px`;

      gsap.to(track, {
        x: () => -getMaxScroll(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          scrub: 1,
          start: "top top",
          end: () => `+=${distance}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => highlightCard(self.progress),
          onLeaveBack: resetCarousel,
          onEnterBack: resetCarousel,
        },
      });

      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 88%",
              toggleActions: "play reverse play reverse",
            },
          },
        );
      }

      scheduleMarketingScrollRefresh(150);
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section ref={sectionRef} id="problem" className="carousel-section">
      <div className="rule carousel-rule" />

      <div ref={headingRef} className="carousel-heading">
        <span className="section-num" style={{ display: "block", marginBottom: "1em" }}>
          01 / The problem
        </span>
        <h2 className="type-h2" style={{ color: "var(--ink)", fontSize: "clamp(28px, 4vw, 56px)" }}>
          Social shouldn&apos;t feel
          <br />
          like a second job.
        </h2>
        <p className="type-body" style={{ maxWidth: 420, margin: "1.2em auto 0", color: "var(--quiet-sage)" }}>
          posterboy posts for your business so you don&apos;t have to.
        </p>
      </div>

      <div ref={wrapRef} className="carousel-wrap">
        <div ref={trackRef} className="carousel-track">
          {CARDS.map((card, i) => (
            <div
              key={card.src}
              ref={(el) => {
                if (el) cardsRef.current[i] = el;
              }}
              className="carousel-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.src} alt="" draggable={false} className="carousel-card-img" />
              <div className="carousel-card-overlay" aria-hidden />
              <span className="carousel-card-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="carousel-card-copy">
                <span className="carousel-card-kicker">{card.kicker}</span>
                <strong className="carousel-card-title">{card.title}</strong>
                <p className="carousel-card-body">{card.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-dots">
        {CARDS.map((_, i) => (
          <div key={i} className="carousel-dot" data-active={activeIndex === i ? "true" : "false"} />
        ))}
      </div>

      <div className="rule carousel-rule" />
    </section>
  );
}
