"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CAROUSEL_IMAGES } from "@/lib/marketing-images";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

gsap.registerPlugin(ScrollTrigger);

const IMAGES = [...CAROUSEL_IMAGES];
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

      const resetCarousel = () => {
        gsap.set(track, { x: 0 });
        cards.forEach((card, i) => {
          gsap.set(card, {
            scale: i === 0 ? 1 : 0.92,
            opacity: i === 0 ? 1 : 0.65,
            rotateY: 0,
            z: 0,
            filter: "brightness(0.85) blur(1px)",
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
          gsap.set(card, {
            scale: on ? 1.04 : near ? 0.96 : 0.9,
            opacity: on ? 1 : near ? 0.78 : 0.58,
            rotateY: on ? 0 : i < clamped ? 14 : -14,
            z: on ? 40 : -30,
            filter: on ? "brightness(1.05) blur(0px)" : "brightness(0.82) blur(1px)",
          });
        });
      };

      if (reducedMotion) {
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
          {IMAGES.map((src, i) => (
            <div
              key={src}
              ref={(el) => {
                if (el) cardsRef.current[i] = el;
              }}
              className="carousel-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" draggable={false} className="carousel-card-img" />
              <div className="carousel-card-glass" aria-hidden />
              <span className="carousel-card-num">{String(i + 1).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-dots">
        {IMAGES.map((_, i) => (
          <div key={i} className="carousel-dot" data-active={activeIndex === i ? "true" : "false"} />
        ))}
      </div>

      <div className="rule carousel-rule" />
    </section>
  );
}
