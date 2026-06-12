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

      // Initial state — paper plane hidden at the loop's entry point (no long
      // runway). It fades in here, loops, and grows into place. will-change
      // promotes it to its own layer for the flight; cleared on landing.
      gsap.set(iconSlot, {
        opacity: 0,
        scale: 0.6,
        x: -25,
        y: 0,
        rotation: 0,
        willChange: "transform",
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

      // 3. Paper plane: fades in right as it starts looping, circles once, and
      //    grows to full size as it lands in its slot — no long runway scoot.
      //    Position and scale are separate tweens so the loop keeps a constant
      //    turn-rate (no whip) while the scale grows independently.
      tl.addLabel("plane", "-=0.4");

      // Fade in right as the loop begins.
      tl.to(iconSlot, { opacity: 1, duration: 0.35, ease: "power1.out" }, "plane");

      // Fly the loop, then arrow into the slot. No runway — it appears at the
      // loop entry, circles once, and lands. Constant speed (ease "none") →
      // constant turn rate, so the nose rotates uniformly with no whip. The
      // loop is an exact bezier circle (tangent to its entry, so no cusp).
      tl.to(
        iconSlot,
        {
          duration: 1.2,
          ease: "none",
          force3D: true,
          motionPath: {
            // SVG path in the icon's transform space (px, relative to the slot
            // at 0,0; negative y is up). The loop is centered roughly over the
            // slot (center -25,-60, r 60) so it sits over the gap rather than
            // off to the left, and its bottom sits at the slot's y so the exit
            // is purely horizontal — tangent-continuous with the loop (no cusp)
            // and it lands flat in the slot:
            //   M start at the loop's bottom-tangent point (-25,0)
            //   C×4 one circle back to it
            //   C exit straight across into the resting slot (0,0)
            path:
              "M -25 0 " +
              "C 8.14 0 35 -26.86 35 -60 " +
              "C 35 -93.14 8.14 -120 -25 -120 " +
              "C -58.14 -120 -85 -93.14 -85 -60 " +
              "C -85 -26.86 -58.14 0 -25 0 " +
              "C -16.5 0 -8 0 0 0",
            autoRotate: true,
          },
        },
        "plane",
      );

      // Grow to full size over the flight, landing at full resolution as it
      // reaches the slot (back.out gives a gentle settle into 1).
      tl.to(iconSlot, { scale: 1, duration: 1.2, ease: "back.out(1.3)" }, "plane");

      // Plant: straighten the nose flat once it has landed.
      tl.to(
        iconSlot,
        {
          rotation: 0,
          duration: 0.4,
          ease: "power3.out",
          onComplete: () => {
            iconSvg?.classList.add("hero-icon-glide-active");
            // Done animating — release the compositor hint.
            gsap.set(iconSlot, { willChange: "auto" });
          },
        },
        "plane+=1.2",
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
            <div className="type-display hero-mobile-title" aria-hidden>
              Post like you
              <br />
              like it.
            </div>
          </div>

          {/* the page's single accessible h1 — visual rows below are decorative */}
          <h1 className="sr-only">Post like you like it.</h1>
          <div className="hero-headline">
            <div className="type-display hero-title-row" aria-hidden>
              <span className="hero-word-static">{splitChars("Post", "post")}</span>
              <span className="hero-word-static">{splitChars("like", "like1")}</span>
              <span className="hero-word-you">{splitChars("you", "you")}</span>
            </div>

            <div className="hero-icon-slot">
              <PosterboyAppIcon className="hero-icon-svg" />
            </div>

            <div className="type-display hero-title-row" aria-hidden>
              <span className="hero-word-like">{splitChars("like", "like2")}</span>
              <span className="hero-word-static">{splitChars("it.", "it")}</span>
            </div>
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
