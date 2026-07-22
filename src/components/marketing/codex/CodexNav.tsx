"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { goToDemo, PRIMARY_CTA } from "@/lib/marketing/demo-intake";
import { track } from "@/lib/marketing/track";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Examples", href: "#examples" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

/** Sparse conversion nav — demo + free trial. */
export default function CodexNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startDemo = () => {
    setOpen(false);
    track("hero_demo_started", { location: "nav" });
    goToDemo();
  };

  return (
    <>
      <header className={`pb-cx-nav${scrolled ? " is-scrolled" : ""}`}>
        <PosterboyLogo
          href="#hero"
          size="header"
          onClick={(e) => {
            e.preventDefault();
            go("#hero");
          }}
        />
        <nav className="pb-cx-nav-links" aria-label="Marketing">
          {LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                go(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/sign-in"
            onClick={() => track("signin_clicked", { location: "nav" })}
          >
            Sign in
          </Link>
          <button type="button" className="pb-cx-nav-cta" onClick={startDemo}>
            {PRIMARY_CTA}
          </button>
        </nav>
        <button
          type="button"
          className="pb-cx-nav-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "×" : "≡"}
        </button>
      </header>

      {open ? (
        <div className="pb-cx-nav-drawer">
          {LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                go(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <Link href="/sign-in" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href={SIGNUP_ONBOARDING_URL} onClick={() => setOpen(false)}>
            Join free beta
          </Link>
          <button type="button" className="pb-cx-nav-cta" onClick={startDemo}>
            {PRIMARY_CTA}
          </button>
        </div>
      ) : null}
    </>
  );
}
