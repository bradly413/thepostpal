import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingSubpageChrome from "@/components/marketing/MarketingSubpageChrome";
import { getVertical, getVerticalAliases, VERTICALS } from "@/lib/verticals";
import { SIGNUP_ONBOARDING_URL } from "@/lib/safe-redirect";
import { SITE_NAME } from "@/lib/site";

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

  // Bare title — the root layout's `%s | ${SITE_NAME}` template appends the brand
  // once. (Previously hand-baked "| Posterboy" here, which doubled the suffix and
  // clashed casing with the lowercase template.)
  const title = `${vertical.name} social media that sells`;
  const description = `${vertical.painPoint} ${vertical.headline}`.trim();

  return {
    title,
    description,
    alternates: {
      canonical: `/for/${slug}`,
    },
    openGraph: {
      // OG title isn't run through the template, so apply the brand suffix
      // explicitly (lowercase, matching the rendered <title>).
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `/for/${slug}`,
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

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) notFound();

  return (
    <MarketingSubpageChrome>
      <section className="pb-hero">
        <p className="pb-pricing-tier-label">{vertical.name}</p>
        <h1>{vertical.headline}</h1>
        <p className="pb-hero-sub">{vertical.painPoint}</p>
        <div className="pb-hero-actions">
          <Link href={SIGNUP_ONBOARDING_URL} className="pb-btn-primary">
            Draft my first week
          </Link>
        </div>
      </section>

      <section className="pb-section">
        <h2>Example posts</h2>
        <div className="pb-draft-preview">
          {vertical.examplePosts.map((post) => (
            <div key={post} className="pb-draft-line">{post}</div>
          ))}
        </div>
      </section>

      <section className="pb-section pb-section-narrow">
        <h2>What you get</h2>
        <ul className="pb-pricing-features">
          {vertical.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
    </MarketingSubpageChrome>
  );
}
