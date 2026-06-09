"use client";

import PosterboyLogo from "@/components/PosterboyLogo";

export default function Footer() {
  const columns = [
    {
      title: "Product",
      items: [
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
        { label: "How it works", href: "/#solution" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "About", href: "/#founder" },
        { label: "Free tool", href: "/tools/what-to-post" },
        { label: "Contact", href: "mailto:hello@posterboysocial.com" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
    {
      title: "Find us",
      items: [
        { label: "Instagram", href: "https://instagram.com" },
        { label: "LinkedIn", href: "https://linkedin.com" },
        { label: "X", href: "https://x.com" },
      ],
    },
  ] as const;

  return (
    <footer id="footer" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: 'clamp(50px, 8vh, 90px) var(--px) clamp(24px, 3vh, 40px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 'clamp(28px, 3vw, 44px)', marginBottom: 'clamp(36px, 5vw, 72px)' }}>
        <div>
          <div style={{ marginBottom: "0.6em" }}>
            <PosterboyLogo href="/" size="footer" />
          </div>
          <p className="type-caption" style={{ color: 'var(--newsprint)', maxWidth: 220, lineHeight: 1.6 }}>
            Social media for people who'd rather not.<br />Built by Bradly for his mom.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <span className="type-label" style={{ display: 'block', marginBottom: '1em', color: 'var(--newsprint)' }}>{col.title}</span>
            {col.items.map((item) => {
              const isExternal = item.href.startsWith("http");
              return (
              <a key={item.label} href={item.href} className="type-caption"
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                style={{ display: 'block', color: 'var(--paper)', marginBottom: '0.5em', opacity: 0.55, transition: 'opacity 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}>
                {item.label}
              </a>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(247,244,238,0.08)', paddingTop: '1.2em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8em' }}>
        <span className="type-caption" style={{ color: 'var(--newsprint)' }}>&copy; 2026 posterboy. All rights reserved.</span>
        <span className="annotation" style={{ opacity: 0.5 }}>v1.1 &mdash; Bradly Robert Creative</span>
      </div>
    </footer>
  );
}