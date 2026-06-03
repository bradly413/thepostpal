"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Check } from "lucide-react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
import { getPublicTiers } from "@/lib/pricing";
import { CONTACT_EMAIL } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

const PUBLIC_TIERS = getPublicTiers();

const TIER_NOTES: Record<string, string> = {
  solo: "premium solo",
  command: "multi-location",
};

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const section = sectionRef.current;
      const heading = headingRef.current;
      const cardsEl = cardsRef.current;
      if (!section) return;

      if (reducedMotion) {
        if (heading) gsap.set(heading, { opacity: 1, y: 0 });
        if (cardsEl) gsap.set(cardsEl.querySelectorAll(".price-card"), { opacity: 1, y: 0 });
        return;
      }

      if (heading) {
        gsap.fromTo(
          heading,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: section,
              start: "top 72%",
              toggleActions: "play reverse play reverse",
            },
          },
        );
      }

      if (cardsEl) {
        const cards = cardsEl.querySelectorAll(".price-card");
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.65,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: cardsEl,
              start: "top 78%",
              toggleActions: "play reverse play reverse",
            },
          },
        );
      }
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section id="pricing" ref={sectionRef} style={{ background: 'var(--paper)', padding: 'clamp(80px, 12vh, 140px) var(--px)', position: 'relative' }}>
      <div ref={headingRef} style={{ marginBottom: 'clamp(40px, 6vw, 80px)', maxWidth: 600 }}>
        <span className="section-num" style={{ display: 'block', marginBottom: '1.5em' }}>03 / Pricing</span>
        <h2 className="type-h2" style={{ color: 'var(--ink)', marginBottom: '0.5em' }}>
          Solo. Command.
        </h2>
        <p className="type-body" style={{ maxWidth: 420 }}>
          Two tiers. No paralysis. Premium operators and multi-location brands on the same calm platform.
        </p>
      </div>

      <div ref={cardsRef} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        gap: 'clamp(20px, 2vw, 32px)',
        maxWidth: 1100,
      }}>
        {PUBLIC_TIERS.map((tier) => (
          <div
            key={tier.id}
            className="price-card"
            style={{
              padding: 'clamp(28px, 3vw, 40px)',
              borderRadius: '24px',
              display: 'flex', flexDirection: 'column', gap: '1.5em',
              background: tier.highlighted ? 'linear-gradient(145deg, var(--neu-bg), #e8e5df)' : 'var(--white)',
              boxShadow: tier.highlighted
                ? '12px 12px 24px var(--neu-shadow-dark), -12px -12px 24px var(--neu-shadow-light), 0 0 0 2px var(--pencil-red)'
                : '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 400 }}>{tier.name}</span>
              <span className="annotation" style={{ fontSize: 9 }}>{TIER_NOTES[tier.id] ?? ""}</span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, lineHeight: 1 }}>{tier.price}</span>
              <span className="type-caption" style={{ marginLeft: '0.25em' }}>{tier.priceNote}</span>
            </div>
            <p className="type-caption" style={{ margin: 0 }}>{tier.description}</p>
            {tier.annualPriceNote && (
              <p className="type-caption" style={{ margin: 0, opacity: 0.85 }}>
                {tier.annualPriceNote}
              </p>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              {tier.features.map((f, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75em',
                  padding: '0.55em 0',
                  borderBottom: '1px solid var(--newsprint)',
                  fontSize: 'clamp(12px, 0.85vw, 14px)',
                }}>
                  <Check size={13} style={{ color: 'var(--quiet-sage)', flexShrink: 0 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href={tier.ctaHref} className="neu-btn" style={{ width: "100%", textDecoration: "none", textAlign: "center" }}>{tier.cta}</Link>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '3em', textAlign: 'center' }}>
        <p className="type-caption">
          Need done-with-you brand work?{' '}
          <a href={`mailto:${CONTACT_EMAIL}?subject=BRC%20Custom`} style={{ color: 'var(--deep-link)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            BRC Custom
          </a>
          . Full details on <Link href="/pricing" style={{ color: 'var(--deep-link)' }}>/pricing</Link>.
        </p>
      </div>

      <div className="rule" style={{ position: 'absolute', bottom: 0, left: 'var(--px)', right: 'var(--px)' }} />
    </section>
  );
}
