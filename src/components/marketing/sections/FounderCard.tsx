"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

export default function FounderCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const card = cardRef.current;
      const section = sectionRef.current;
      if (!card || !section) return;

      if (reducedMotion) {
        gsap.set(card, { opacity: 1, y: 0 });
        return;
      }

    gsap.fromTo(
      card,
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play reverse play reverse",
        },
      },
    );

    const nameSpans = card.querySelectorAll<HTMLElement>(".founder-name-line");
    gsap.fromTo(
      nameSpans,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.12,
        duration: 1,
        ease: "power4.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play reverse play reverse",
        },
      },
    );

    const tiltX = gsap.quickTo(card, "rotateY", { duration: 0.45, ease: "power2.out" });
    const tiltY = gsap.quickTo(card, "rotateX", { duration: 0.45, ease: "power2.out" });

    const onMouseMove = (e: MouseEvent) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tiltX(x * 8);
      tiltY(-y * 8);
    };
    const onMouseLeave = () => {
      tiltX(0);
      tiltY(0);
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      onLeaveBack: () => {
        tiltX(0);
        tiltY(0);
        gsap.set(card, { rotateX: 0, rotateY: 0 });
      },
    });

    card.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);

    return () => {
      st.kill();
      card.removeEventListener("mousemove", onMouseMove);
      card.removeEventListener("mouseleave", onMouseLeave);
    };
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section
      ref={sectionRef}
      id="founder"
      style={{
        background: 'var(--paper)',
        padding: 'clamp(80px, 12vh, 140px) var(--px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: '-50%',
        background: 'radial-gradient(circle at 20% 30%, rgba(182,75,58,0.15), transparent 35%), radial-gradient(circle at 75% 65%, rgba(43,58,103,0.12), transparent 40%)',
        filter: 'blur(140px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 500,
        margin: '0 auto',
        position: 'relative',
        perspective: 1000,
      }}>
        <span className="section-num" style={{ display: 'block', marginBottom: '1.5em', textAlign: 'center' }}>Meet the founder</span>

        <div
          ref={cardRef}
          style={{
            position: 'relative',
            padding: '48px 42px',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: 20,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)',
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
            cursor: 'pointer',
          }}
        >
          <div
            className="founder-splash"
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle at 30% 30%, #B64B3A, rgba(182,75,58,0.3) 60%, transparent 70%)',
              opacity: 0.35,
              filter: 'blur(60px)',
              pointerEvents: 'none',
              mixBlendMode: 'screen',
            }}
          />

          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '-1px',
            position: 'relative',
            zIndex: 2,
          }}>
            <span className="founder-name-line" style={{ display: 'block', color: 'var(--ink)' }}>Bradly</span>
            <span className="founder-name-line" style={{ display: 'block', color: 'var(--ink)' }}>Robert</span>
          </div>

          <div style={{
            marginTop: 12,
            fontSize: 11,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'var(--quiet-sage)',
            position: 'relative',
            zIndex: 2,
          }}>
            Founder & Creative Director
          </div>

          <div style={{
            margin: '28px 0 14px',
            height: 1,
            background: 'linear-gradient(to right, transparent, var(--newsprint), transparent)',
            opacity: 0.4,
            position: 'relative',
            zIndex: 2,
          }} />
          <div style={{
            width: 6,
            height: 6,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #B64B3A, #2B3A67)',
            opacity: 0.7,
            position: 'relative',
            zIndex: 2,
          }} />

          <div style={{ display: 'grid', gap: 14, position: 'relative', zIndex: 2 }}>
            {[
              { paths: ["M4 6h16v12H4z", "M4 6l8 7 8-7"], label: "bradly@posterboy.social" },
              {
                paths: [
                  "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
                ],
                label: "posterboy.social",
              },
              {
                paths: [
                  "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z",
                ],
                label: "@bradlycreates",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 13,
                  color: 'var(--quiet-sage)',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--quiet-sage)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="url(#founder-gradient)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <defs>
                    <linearGradient id="founder-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#B64B3A" />
                      <stop offset="100%" stopColor="#2B3A67" />
                    </linearGradient>
                  </defs>
                  {item.paths.map((path, pi) => (
                    <path key={pi} className="founder-icon-path" d={path} />
                  ))}
                </svg>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div
            className="founder-watermark"
            style={{
              position: 'absolute',
              bottom: -30,
              right: -20,
              fontFamily: 'var(--font-serif)',
              fontSize: 120,
              fontWeight: 400,
              letterSpacing: -8,
              color: 'rgba(8,8,8,0.03)',
              transform: 'rotate(-8deg)',
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
              lineHeight: 1,
            }}
          >
            BR
          </div>

          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px dashed var(--newsprint)',
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--quiet-sage)',
            fontStyle: 'italic',
            position: 'relative',
            zIndex: 2,
          }}>
            "I built posterboy for my mom. She ran a business and hated social media. Now it helps hundreds of owners just like her."
          </div>
        </div>
      </div>

      <div className="rule" style={{ position: 'absolute', bottom: 0, left: 'var(--px)', right: 'var(--px)' }} />
    </section>
  );
}