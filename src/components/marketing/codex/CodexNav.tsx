"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Compare", href: "#compare" },
  { label: "Results", href: "#results" },
  { label: "Pricing", href: "#pricing" },
] as const;

/** Sparse conversion nav — Munch-style link set, Posterboy CTAs. */
export default function CodexNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <header className="pb-cx-nav">
        <PosterboyLogo
          href="#demo"
          size="header"
          onClick={(e) => {
            e.preventDefault();
            go("#demo");
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
          <Link href="/sign-in">Sign in</Link>
          <Link href={SIGNUP_ONBOARDING_URL} className="pb-cx-nav-cta">
            Start free trial
          </Link>
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
          <Link
            href={SIGNUP_ONBOARDING_URL}
            className="pb-cx-nav-cta"
            onClick={() => setOpen(false)}
          >
            Start free trial
          </Link>
        </div>
      ) : null}
    </>
  );
}
