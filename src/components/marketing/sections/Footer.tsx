"use client";

import Link from "next/link";
import PosterboyLogo from "@/components/PosterboyLogo";

export default function Footer() {
  const columns = [
    {
      title: "Product",
      items: [
        { label: "How it works", href: "/#how" },
        { label: "Pricing", href: "/pricing" },
        { label: "For multi-location teams", href: "/for/multi-location" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "Free tool", href: "/tools/what-to-post" },
        { label: "Contact", href: "mailto:hello@posterboysocial.com" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Data deletion", href: "/data-deletion" },
      ],
    },
  ] as const;

  return (
    <footer className="pb-cx-footer" id="footer">
      <div className="pb-cx-footer-grid">
        <div>
          <div className="pb-cx-footer-logo">
            <PosterboyLogo href="/" size="footer" />
          </div>
          <p className="pb-cx-footer-blurb">
            Social media for people who&apos;d rather not.
            <br />
            Built by Bradly for his mom.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <span className="pb-cx-footer-col-title">{col.title}</span>
            {col.items.map((item) => {
              const isExternal = item.href.startsWith("http");
              const isMail = item.href.startsWith("mailto:");
              if (isExternal || isMail) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="pb-cx-footer-link"
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link key={item.label} href={item.href} className="pb-cx-footer-link">
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="pb-cx-footer-bar">
        <span>&copy; 2026 posterboy. All rights reserved.</span>
        <span className="pb-cx-footer-meta">Bradly Robert Creative</span>
      </div>
    </footer>
  );
}
