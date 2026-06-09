import type { ReactNode } from "react";
import Link from "next/link";
import MarketingSubpageChrome from "@/components/marketing/MarketingSubpageChrome";
import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/site";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: "2.25rem" }}>
      <h2
        className="type-heading"
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}
      >
        {title}
      </h2>
      <div className="type-body" style={{ display: "grid", gap: "0.85rem", lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
}

export default function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <MarketingSubpageChrome>
      <article className="pb-section" style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 className="pb-display">{title}</h1>
        <p className="type-caption" style={{ marginTop: "0.75rem" }}>
          Last updated {updated} · {SITE_DOMAIN}
        </p>
        <div style={{ marginTop: "1.5rem" }}>{children}</div>
        <p className="type-caption" style={{ marginTop: "3rem" }}>
          Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {" · "}
          <Link href="/">Back to home</Link>
        </p>
      </article>
    </MarketingSubpageChrome>
  );
}
