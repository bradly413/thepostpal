"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

export default function HolographicFeature() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const section = sectionRef.current;
      const card = cardRef.current;
      const title = titleRef.current;
      if (!section || !card || !title) return;

      if (reducedMotion) {
        gsap.set([card, title], { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        card,
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            toggleActions: "play reverse play reverse",
          },
        },
      );

      gsap.fromTo(
        title,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            toggleActions: "play reverse play reverse",
          },
        },
      );

    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section
      ref={sectionRef}
      id="features"
      style={{
        background: 'var(--ink)',
        position: 'relative',
        overflow: 'hidden',
        padding: 'clamp(80px, 15vh, 160px) var(--px)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-radial-gradient(circle, rgba(247,244,238,0.03) 0 1px, transparent 1px 2px)',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        opacity: 0.5,
        animation: 'grain 0.25s steps(2) infinite',
      }} />

      <span className="section-num" style={{
        display: 'block',
        marginBottom: '2em',
        color: 'var(--pencil-red)',
        position: 'relative',
        zIndex: 2,
      }}>
        Why posterboy works
      </span>

      <h2
        ref={titleRef}
        style={{
          position: 'relative',
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(32px, 7vw, 80px)',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--paper)',
          marginBottom: '2em',
          textAlign: 'center',
          zIndex: 2,
          textShadow: '2px 0 0 rgba(182,75,58,0.3), -2px 0 0 rgba(43,58,103,0.3)',
        }}
      >
        Social made tolerable
      </h2>

      <div
        ref={cardRef}
        style={{
          width: 'min(480px, 90vw)',
          padding: 'clamp(32px, 4vw, 48px)',
          borderRadius: 28,
          background: 'linear-gradient(120deg, rgba(247,244,238,0.08), rgba(247,244,238,0.02))',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 50px rgba(182,75,58,0.15), inset 0 0 35px rgba(247,244,238,0.05)',
          transformStyle: 'preserve-3d',
          position: 'relative',
          zIndex: 2,
          perspective: 1000,
        }}
      >
        <div style={{
          position: 'absolute',
          inset: -2,
          background: 'linear-gradient(120deg, transparent 20%, #B64B3A, #2B3A67, #6F7A68, transparent 80%)',
          filter: 'blur(25px)',
          opacity: 0.3,
          zIndex: -1,
          animation: 'holo-shift 4s linear infinite',
          backgroundSize: '400% 100%',
          borderRadius: 30,
        }} />

        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(20px, 2.5vw, 28px)',
          color: 'var(--paper)',
          marginBottom: '1em',
        }}>
          The anti-agency approach
        </div>
        <p style={{
          color: 'rgba(247,244,238,0.75)',
          lineHeight: 1.7,
          fontSize: 15,
          marginBottom: '2em',
        }}>
          No retainers. No meetings about meetings. No jargon.
          Just consistent, on-brand social content delivered to your inbox —
          drafted, scheduled, and ready for your single tap of approval.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: '2em',
        }}>
          {[
            { num: '3', label: 'posts/week' },
            { num: '14', label: 'day trial' },
            { num: '1', label: 'tap approve' },
            { num: '0', label: 'newsfeed doom' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px, 3vw, 40px)',
                color: 'var(--paper)',
                lineHeight: 1,
              }}>{stat.num}</div>
              <div style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'rgba(247,244,238,0.5)',
                marginTop: 4,
              }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <Link href="/sign-in?mode=signup&next=%2Fonboarding" className="neu-btn" style={{ width: "100%", background: "linear-gradient(90deg, #B64B3A, #2B3A67)", color: "var(--paper)", boxShadow: "0 0 25px rgba(182,75,58,0.3)", textDecoration: "none", display: "block", textAlign: "center" }}>Start your free trial</Link>
      </div>

      <style>{`
        @keyframes grain {
          to { transform: translate(2px, -2px); }
        }
        @keyframes holo-shift {
          to { background-position: 400% 0; }
        }
      `}</style>
    </section>
  );
}