"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import PosterboyAppIcon from "@/components/marketing/PosterboyAppIcon";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(MotionPathPlugin);

/** Splits a string into <span class="hero-char"> tokens. Each char animates independently. */
function splitChars(text: string, prefix: string) {
  return text.split("").map((char, i) => (
    <span key={`${prefix}-${i}`} className="hero-char" data-char={char}>
      {char}
    </span>
  ));
}

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { reducedMotion, scrollToAnchor } = useMarketingScroll();

  const scrollToSolution = () => {
    scrollToAnchor("#solution");
  };

  useGSAP(
    () => {
      const root = heroRef.current;
      if (!root) return;

      const chars = root.querySelectorAll<HTMLElement>(".hero-char");
      const youWord = root.querySelector<HTMLElement>(".hero-word-you");
      const likeWord = root.querySelector<HTMLElement>(".hero-word-like");
      const iconSlot = root.querySelector<HTMLElement>(".hero-icon-slot");
      const iconSvg = root.querySelector<HTMLElement>(".hero-icon-svg");
      const mobileLockup = root.querySelector<HTMLElement>(".hero-mobile-lockup");
      const sub = root.querySelector<HTMLElement>(".hero-sub");
      const cta = root.querySelector<HTMLElement>(".hero-cta");
      const isMobileLayout =
        typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

      if (reducedMotion) {
        gsap.set(chars, { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" });
        gsap.set(iconSlot, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });
        gsap.set(mobileLockup, { opacity: 1, y: 0 });
        gsap.set([sub, cta], { opacity: 1, y: 0 });
        iconSvg?.classList.add("hero-icon-glide-active");
        return;
      }

      if (isMobileLayout) {
        gsap.set(mobileLockup, { opacity: 1, y: 0 });
        gsap.set([sub, cta], { opacity: 1, y: 0 });
        return;
      }

      // Initial state — paper plane parked off-stage to the left,
      // pointing toward its final position.
      gsap.set(iconSlot, {
        opacity: 0,
        scale: 0.7,
        x: -640,
        y: -20,
        rotation: 0,
      });

      const tl = gsap.timeline({ delay: 0.25 });

      // 1. Characters fade-blur-in, left to right.
      tl.to(chars, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.045,
      });

      // 2. "you" and "like" push apart to make room for the plane (subtle).
      tl.to(
        youWord,
        { x: -4, duration: 0.55, ease: "power3.out" },
        "-=0.05",
      );
      tl.to(
        likeWord,
        { x: 4, duration: 0.55, ease: "power3.out" },
        "<",
      );

      // 3. Paper plane flies straight in from the left and lands flat.
      //    No rotation, no loop — a simple, fast glide into place.
      tl.to(
        iconSlot,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
          onComplete: () => {
            iconSvg?.classList.add("hero-icon-glide-active");
          },
        },
        "-=0.35",
      );

      // 4. Subtitle + CTAs fade in last.
      tl.to(
        [sub, cta],
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.12,
        },
        "-=0.35",
      );
    },
    { scope: heroRef, dependencies: [reducedMotion] },
  );

  return (
    <div ref={heroRef} className="hero-flip" id="hero">
      <div className="hero-pin">
        <div className="hero-copy">
          <div className="hero-mobile-lockup">
            <div className="hero-mobile-mark">
              <PosterboyAppIcon className="hero-mobile-mark-icon" />
            </div>
            <p className="type-label hero-mobile-kicker">AI social for busy owners</p>
            <h1 className="type-display hero-mobile-title">
              Post like you
              <br />
              like it.
            </h1>
          </div>

          <div className="hero-headline">
            <h1 className="type-display hero-title-row">
              <span className="hero-word-static">{splitChars("Post", "post")}</span>
              <span className="hero-word-static">{splitChars("like", "like1")}</span>
              <span className="hero-word-you">{splitChars("you", "you")}</span>
            </h1>

            <div className="hero-icon-slot">
              <PosterboyAppIcon className="hero-icon-svg" />
            </div>

            <h1 className="type-display hero-title-row">
              <span className="hero-word-like">{splitChars("like", "like2")}</span>
              <span className="hero-word-static">{splitChars("it.", "it")}</span>
            </h1>
          </div>

          <div className="hero-sub">
            <p className="type-body">
              Posterboy creates, schedules, and publishes so your business stays active
              without becoming your second job.
            </p>
          </div>

          <div className="hero-cta">
            <Link href={SIGNUP_ONBOARDING_URL} className="neu-btn" style={{ textDecoration: "none" }}>
              Get Started
            </Link>
            <button type="button" className="neu-btn hero-cta-secondary" onClick={scrollToSolution}>
              See the workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
