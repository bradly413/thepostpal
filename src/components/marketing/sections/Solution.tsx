"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// "How it works" — a calm, plain-language five-step walkthrough. No scroll-jack,
// no flowchart: just Connect → Draft → Approve → Publish → Report, the way an
// owner would actually describe it.
const STEPS = [
  {
    title: "Connect",
    badge: "2 min",
    desc: "Link your accounts once. Takes about two minutes — then you're set.",
  },
  {
    title: "Draft",
    badge: "Mon AM",
    desc: "Every Monday, a full week of posts shows up, written in your voice.",
  },
  {
    title: "Approve",
    badge: "under a minute",
    desc: "Skim them and tap approve. Tweak anything you like, or just say yes.",
  },
  {
    title: "Publish",
    badge: "automatic",
    desc: "Posterboy posts them at the right times, across all your platforms.",
  },
  {
    title: "Report",
    badge: "monthly",
    desc: "Once a month, a simple recap lands in your inbox. No dashboards to dig through.",
  },
];

export default function Solution() {
  const sectionRef = useRef<HTMLElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;
      const section = sectionRef.current;
      if (!section) return;

      const head = section.querySelector<HTMLElement>(".sol-head");
      const steps = section.querySelectorAll<HTMLElement>(".sol-step");

      if (reducedMotion) {
        gsap.set([head, ...Array.from(steps)].filter(Boolean), { opacity: 1, y: 0 });
        return;
      }

      if (head) {
        gsap.fromTo(
          head,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: head, start: "top 84%", toggleActions: "play none none reverse" },
          },
        );
      }

      gsap.fromTo(
        steps,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.09,
          immediateRender: false,
          scrollTrigger: {
            trigger: ".sol-steps",
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section ref={sectionRef} id="solution" className="sol">
      <div className="sol-head">
        <span className="section-num sol-num-kicker">How it works</span>
        <h2 className="type-display sol-title">
          Set it up once.
          <br />
          <span className="sol-accent">Then forget about it.</span>
        </h2>
        <p className="sol-lede">
          Connect your accounts, and Posterboy takes the week from there — drafting,
          scheduling, and posting while you run your business.
        </p>
      </div>

      <ol className="sol-steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="sol-step">
            <div className="sol-step-top">
              <span className="sol-step-num">{i + 1}</span>
              <span className="sol-step-badge">{step.badge}</span>
            </div>
            <h3 className="sol-step-title">{step.title}</h3>
            <p className="sol-step-desc">{step.desc}</p>
          </li>
        ))}
      </ol>

      <style>{`
        .pb-marketing-site .sol {
          --pb-red: #ee2532;
          position: relative;
          background: var(--paper);
          padding: clamp(72px, 12vh, 140px) var(--px);
        }
        .pb-marketing-site .sol-head {
          max-width: 720px;
          margin: 0 auto clamp(40px, 6vh, 68px);
          text-align: center;
        }
        .pb-marketing-site .sol-num-kicker { color: var(--pb-red); }
        .pb-marketing-site .sol-title {
          margin: 0.55em 0 0;
          font-size: clamp(30px, 5vw, 56px);
          line-height: 1.04;
          letter-spacing: -0.025em;
        }
        .pb-marketing-site .sol-accent { color: var(--pb-red); }
        .pb-marketing-site .sol-lede {
          margin: 1.1em auto 0;
          max-width: 52ch;
          font-size: clamp(15px, 1.1vw, 18px);
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 64%, transparent);
        }

        .pb-marketing-site .sol-steps {
          list-style: none;
          margin: 0 auto;
          padding: 0;
          max-width: 1120px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: clamp(12px, 1.4vw, 18px);
          counter-reset: none;
        }
        @media (max-width: 980px) {
          .pb-marketing-site .sol-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        }
        @media (max-width: 540px) {
          .pb-marketing-site .sol-steps { grid-template-columns: 1fr; }
        }
        .pb-marketing-site .sol-step {
          background: var(--white);
          border: 1px solid var(--newsprint);
          border-radius: 16px;
          padding: clamp(16px, 1.4vw, 22px);
          display: flex;
          flex-direction: column;
          box-shadow: 0 16px 36px -28px rgba(15,15,20,0.28);
        }
        .pb-marketing-site .sol-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .pb-marketing-site .sol-step-num {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--pb-red);
          color: var(--paper);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-serif);
          font-size: 15px;
          font-weight: 500;
          line-height: 1;
        }
        .pb-marketing-site .sol-step-badge {
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--quiet-sage);
          background: color-mix(in srgb, var(--paper) 55%, var(--white));
          border: 1px solid var(--newsprint);
          border-radius: 999px;
          padding: 3px 9px;
          white-space: nowrap;
        }
        .pb-marketing-site .sol-step-title {
          margin: 0 0 0.4em;
          font-family: var(--font-serif);
          font-size: clamp(19px, 1.6vw, 23px);
          font-weight: 500;
          letter-spacing: -0.015em;
          color: var(--ink);
        }
        .pb-marketing-site .sol-step-desc {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 66%, transparent);
        }
      `}</style>
    </section>
  );
}
