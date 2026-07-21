"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import BulkUploadFeatureAnimation from "@/components/marketing/codex/BulkUploadFeatureAnimation";

const STEPS = [
  {
    n: "01",
    title: "We learn your brand in minutes",
    body: "Brand book, voice, and photos — so every draft sounds like you, not a content calendar.",
    kind: "image" as const,
    img: "/marketing/capabilities/cap-studio.jpg",
    alt: "Brand-aware Studio generation",
  },
  {
    n: "02",
    title: "Studio + captions draft the week",
    body: "Describe the post. Posterboy makes the image and writes captions in your voice.",
    kind: "image" as const,
    img: "/images/social-mocks/05.png",
    alt: "Captioned social post",
  },
  {
    n: "03",
    title: "Approve on the calendar",
    body: "Your week lands on Schedule. Bulk upload when you have a folder. Quiet reminders — not a hustle dashboard.",
    kind: "demo" as const,
  },
  {
    n: "04",
    title: "Publish to Facebook and Instagram",
    body: "Connect Meta once. Queue posts from one calm workspace. Failures surface with retry.",
    kind: "image" as const,
    img: "/marketing/capabilities/cap-publish.jpg",
    alt: "Publish to connected channels",
  },
] as const;

/** Four-step how-it-works with real product demos — Munch spine, Posterboy UI. */
export default function HowItWorks() {
  const demoRef = useRef<HTMLDivElement | null>(null);
  const [demoInView, setDemoInView] = useState(false);

  useEffect(() => {
    const el = demoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setDemoInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="pb-how" id="how" aria-labelledby="pb-how-title">
      <div className="pb-how-head">
        <p className="pb-how-kicker">How it works</p>
        <h2 id="pb-how-title">
          Run your social in
          <br />
          <strong>ten quiet minutes a week.</strong>
        </h2>
        <p className="pb-how-sub">
          Posterboy handles the feed so you can run the place. Learn once, draft the week,
          approve, publish.
        </p>
      </div>

      <ol className="pb-how-steps">
        {STEPS.map((step) => (
          <li key={step.n} className="pb-how-step">
            <div className="pb-how-step-copy">
              <span className="pb-how-step-n">Step {step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
            <div className="pb-how-step-media">
              {step.kind === "demo" ? (
                <div className="pb-how-demo" ref={demoRef}>
                  <BulkUploadFeatureAnimation active={demoInView} />
                </div>
              ) : (
                <Image
                  src={step.img}
                  alt={step.alt}
                  width={720}
                  height={540}
                  className="pb-how-step-img"
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="pb-how-cta-row">
        <Link href={SIGNUP_ONBOARDING_URL} className="pb-how-cta">
          Get started for free
        </Link>
      </div>
    </section>
  );
}
