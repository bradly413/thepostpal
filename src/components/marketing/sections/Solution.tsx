"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { MARKETING_IMAGES } from "@/lib/marketing-images";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";
gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: "1",
    title: "Connect",
    color: "rgba(43,58,103,0.75)",
    img: MARKETING_IMAGES.phonePost,
    users: "1",
    views: "tap",
    done: "done",
    badgeDelta: "2 min",
  },
  {
    num: "2",
    title: "Draft",
    color: "rgba(182,75,58,0.75)",
    img: MARKETING_IMAGES.carousel1,
    users: "3",
    views: "posts",
    done: "weekly",
    badgeDelta: "Mon AM",
  },
  {
    num: "3",
    title: "Approve",
    color: "rgba(111,122,104,0.75)",
    img: MARKETING_IMAGES.carousel2,
    users: "1",
    views: "tap",
    done: "yes",
    badgeDelta: "<60s",
  },
  {
    num: "4",
    title: "Publish",
    color: "rgba(43,58,103,0.75)",
    img: MARKETING_IMAGES.carousel3,
    users: "2",
    views: "platforms",
    done: "auto",
    badgeDelta: "On time",
  },
  {
    num: "5",
    title: "Report",
    color: "rgba(182,75,58,0.75)",
    img: MARKETING_IMAGES.carousel4,
    users: "1",
    views: "summary",
    done: "monthly",
    badgeDelta: "Quiet",
  },
];

const CARD_POSITIONS = [
  { x: 470, y: 450 },
  { x: 860, y: 200 },
  { x: 860, y: 450 },
  { x: 860, y: 700 },
  { x: 2650, y: 450 },
];

export default function Solution() {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { ready, reducedMotion } = useMarketingScroll();

  useGSAP(
    () => {
      if (!ready) return;

      const wrapper = wrapperRef.current;
      const canvas = canvasRef.current;
      if (!wrapper || !canvas) return;

      const scrollMax = () => Math.max(canvas.scrollWidth - window.innerWidth + 160, 1);

      if (reducedMotion) {
        gsap.set(canvas, { x: 0 });
        gsap.set(canvas.querySelectorAll(".gs-reveal"), { opacity: 1, scale: 1 });
        gsap.set(canvas.querySelectorAll(".line-path"), { strokeDashoffset: 0 });
        return;
      }

      gsap.set(canvas.querySelectorAll<HTMLElement>(".gs-reveal"), { opacity: 1, scale: 1 });

      const paths = canvas.querySelectorAll<SVGPathElement>(".line-path");
      paths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      });

      const resetFlow = () => {
        gsap.set(canvas, { x: 0 });
        paths.forEach((path) => {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDashoffset: length });
        });
      };

      const distance = scrollMax();
      wrapper.style.minHeight = `${distance + window.innerHeight}px`;

      ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: () => `+=${distance}`,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(canvas, { x: -distance * p });
          paths.forEach((path) => {
            const length = path.getTotalLength();
            gsap.set(path, { strokeDashoffset: length * (1 - p) });
          });
        },
        onLeaveBack: resetFlow,
        onEnterBack: resetFlow,
      });
    },
    { scope: sectionRef, dependencies: [ready, reducedMotion] },
  );

  return (
    <section ref={sectionRef} id="solution" style={{ background: "var(--paper)", position: "relative" }}>
      <div className="container" style={{ paddingTop: "clamp(60px, 10vh, 120px)", paddingBottom: "2em" }}>
        <span className="section-num" style={{ display: "block", marginBottom: "1em" }}>
          02 / The solution
        </span>
        <h2 className="type-h2" style={{ color: "var(--ink)", marginBottom: "0.5em" }}>
          Five steps.
          <br />
          One scroll. Done.
        </h2>
        <p className="type-body" style={{ maxWidth: 400 }}>
          Connect your accounts once. We draft, you approve, we publish. The week handled.
        </p>
      </div>

      <div ref={wrapperRef} className="flowchart-wrapper flowchart-scroll-zone">
        <div className="flowchart-pin-panel">
        <div ref={canvasRef} className="flowchart-canvas">
          <svg className="flowchart-svg" viewBox="0 0 3000 900">
            <path className="line-path" d="M 120 450 L 350 450" />
            <path className="line-path" d="M 590 450 C 720 450, 780 200, 980 200" />
            <path className="line-path" d="M 590 450 L 980 450" />
            <path className="line-path" d="M 590 450 C 720 450, 780 700, 980 700" />
            <path className="line-path" d="M 1220 450 L 1520 450" />
            <path className="line-path" d="M 1760 450 C 1890 450, 1950 200, 2150 200" />
            <path className="line-path" d="M 1760 450 L 2150 450" />
            <path className="line-path" d="M 1760 450 C 1890 450, 1950 700, 2150 700" />
            <path className="line-path" d="M 2390 450 L 2650 450" />
          </svg>

          {[120, 350, 590, 980, 980, 980, 1220, 1520, 1760, 2150, 2150, 2150, 2390, 2650].map((left, i) => {
            const tops = [450, 450, 450, 200, 450, 700, 450, 450, 450, 200, 450, 700, 450, 450];
            return <div key={`dot-${i}`} className="clay clay-dot gs-reveal" style={{ left, top: tops[i] }} />;
          })}

          {[235, 720, 750, 720, 1370, 1890, 1920, 1890, 2520].map((left, i) => {
            const tops = [450, 320, 450, 580, 450, 320, 450, 580, 450];
            return (
              <div key={`plus-${i}`} className="clay clay-plus gs-reveal" style={{ left, top: tops[i] }}>
                +
              </div>
            );
          })}

          {STEPS.map((step, i) => {
            const pos = CARD_POSITIONS[i];
            return (
              <div
                key={step.num}
                className="clay clay-card gs-reveal"
                style={{ left: pos.x, top: pos.y }}
              >
                <div className="card-top">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.img} alt={step.title} />
                  <div className="card-overlay" style={{ background: step.color }} />
                  <div className="card-badges">
                    <span className="card-badge card-badge--num">{step.num}</span>
                    <span className="card-badge">{step.badgeDelta}</span>
                  </div>
                  <div className="card-title">{step.title}</div>
                </div>
                <div className="card-stats">
                  <span>{step.users}</span>
                  <span>{step.views}</span>
                  <span>{step.done}</span>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <p className="scroll-hint">Scroll to trace the flow</p>
      </div>

      <div className="rule" style={{ margin: "0 var(--px)" }} />
    </section>
  );
}
