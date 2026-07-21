import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import MarketingSubpageChrome from "@/components/marketing/MarketingSubpageChrome";
import { getVertical, getVerticalAliases, VERTICALS } from "@/lib/verticals";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vertical = getVertical(slug);

  if (!vertical) {
    return {
      title: "Social media that sells",
      description:
        "A calm social-media tool for businesses that don't want one. Your week is drafted.",
    };
  }

  // Root layout template appends "| posterboy" — no brand suffix here, and
  // alias slugs canonicalize to the primary vertical URL.
  const title = `${vertical.name} social media that sells`;
  const description = `${vertical.painPoint} ${vertical.headline}`.trim();

  return {
    title,
    description,
    alternates: {
      canonical: `/for/${vertical.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/for/${vertical.slug}`,
      type: "website",
    },
  };
}

export function generateStaticParams() {
  const slugs = [
    ...VERTICALS.map((v) => v.slug),
    ...getVerticalAliases(),
  ];
  return slugs.map((slug) => ({ slug }));
}

const PRODUCT_STEPS = [
  {
    title: "Create in Studio",
    copy: "Turn a plain-English brief into an on-brand image for feed or Reels.",
  },
  {
    title: "Caption in your voice",
    copy: "Drafts that sound like the business — edit once, we learn what you keep.",
  },
  {
    title: "Schedule & publish",
    copy: "Land the week on the calendar. Publish to Facebook and Instagram when ready.",
  },
] as const;

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) notFound();
  // Alias slugs 301 to the canonical vertical URL instead of serving
  // duplicate content under two addresses.
  if (slug !== vertical.slug) permanentRedirect(`/for/${vertical.slug}`);

  return (
    <MarketingSubpageChrome>
      <section className="pb-hero">
        <p className="pb-pricing-tier-label">{vertical.name}</p>
        <h1>{vertical.headline}</h1>
        <p className="pb-hero-sub">{vertical.painPoint}</p>
        <div className="pb-hero-actions">
          <Link href={SIGNUP_ONBOARDING_URL} className="pb-btn-primary">
            Start free trial
          </Link>
          <Link href="/pricing" className="pb-btn-secondary">
            See pricing
          </Link>
        </div>
        <p className="type-caption" style={{ marginTop: "1rem", color: "var(--quiet-sage)" }}>
          Free to start · No credit card required
        </p>
      </section>

      <section className="pb-section pb-section-narrow">
        <h2>The problem</h2>
        <p className="pb-hero-sub" style={{ margin: 0 }}>
          {vertical.painPoint} Posterboy drafts the week so you stay consistent without
          becoming a content department.
        </p>
      </section>

      <section className="pb-section">
        <h2>What Posterboy does for {vertical.name.toLowerCase()}</h2>
        <ul className="pb-pricing-features">
          {PRODUCT_STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}.</strong> {step.copy}
            </li>
          ))}
        </ul>
      </section>

      <section className="pb-section">
        <h2>Example week</h2>
        <div className="pb-draft-preview">
          {vertical.examplePosts.map((post) => (
            <div key={post} className="pb-draft-line">{post}</div>
          ))}
        </div>
      </section>

      <section className="pb-section pb-section-narrow">
        <h2>Included</h2>
        <ul className="pb-pricing-features">
          {vertical.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="pb-hero-actions" style={{ marginTop: "1.75rem" }}>
          <Link href={SIGNUP_ONBOARDING_URL} className="pb-btn-primary">
            Draft my first week
          </Link>
        </div>
      </section>
    </MarketingSubpageChrome>
  );
}
