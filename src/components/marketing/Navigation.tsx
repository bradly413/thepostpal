"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import PosterboyLogo from "@/components/PosterboyLogo";
import { useMarketingScroll } from "@/components/marketing/MarketingScrollProvider";

const NAV = [
  { label: "Why", href: "#problem" },
  { label: "How", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "Founder", href: "#founder" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollToAnchor } = useMarketingScroll();

  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;
    const HIDE_THRESHOLD = 280; // never hide before user has scrolled past hero a bit
    const DELTA = 6; // ignore tiny scrolls / scroll jitter

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const diff = y - lastY;
        setScrolled(y > 80);
        if (open) {
          setHidden(false);
        } else if (y < HIDE_THRESHOLD) {
          setHidden(false);
        } else if (diff > DELTA) {
          // scrolling down past threshold — hide
          setHidden(true);
        } else if (diff < -DELTA) {
          // scrolling up — reveal
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const scrollTo = (href: string) => {
    scrollToAnchor(href);
    setOpen(false);
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          inset: "0 0 auto 0",
          zIndex: 100,
          padding: "18px var(--px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mixBlendMode: "difference",
          color: "#fff",
          opacity: hidden ? 0 : scrolled ? 0.92 : 1,
          transform: hidden ? "translateY(-110%)" : "translateY(0)",
          pointerEvents: hidden ? "none" : "auto",
          transition:
            "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease",
          willChange: "transform, opacity",
        }}
      >
        <PosterboyLogo
          href="#"
          size="header"
          onClick={(e) => {
            e.preventDefault();
            scrollToAnchor("#hero");
          }}
        />
        <nav
          className="hide-mobile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(14px, 1.8vw, 28px)",
          }}
        >
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(item.href);
              }}
              style={{
                color: "inherit",
                textDecoration: "none",
                fontSize: "clamp(10px, 0.75vw, 12px)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                opacity: 0.7,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/sign-in"
            style={{
              padding: "10px 20px",
              fontSize: 10,
              letterSpacing: "0.08em",
              mixBlendMode: "normal",
              color: "#F7F4EE",
              background: "#080808",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              textTransform: "uppercase",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "transform 0.2s ease",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </nav>
        <button
          type="button"
          className="hide-desktop"
          onClick={() => setOpen(!open)}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            fontSize: 22,
            cursor: "pointer",
          }}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? "\u00d7" : "\u2261"}
        </button>
      </header>
      {open && (
        <div
          className="hide-desktop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "var(--paper)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.5em",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              top: 18,
              right: "var(--px)",
              background: "none",
              border: "none",
              fontSize: 28,
              cursor: "pointer",
            }}
          >
            &times;
          </button>
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(item.href);
              }}
              className="type-h2"
              style={{
                color: "var(--ink)",
                textDecoration: "none",
                fontSize: "clamp(28px, 8vw, 48px)",
              }}
            >
              {item.label}
            </a>
          ))}
          <Link href="/sign-in" className="neu-btn" style={{ textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      )}
    </>
  );
}
