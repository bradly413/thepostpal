import type { Metadata } from "next";
import MarketingSite from "@/components/marketing/MarketingSite";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Social media for local businesses | Posterboy Social" },
  description:
    "Posterboy writes, schedules, and publishes your Facebook and Instagram posts in your own voice. Pick your business type, watch three posts write themselves, and approve the week from your phone.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Posterboy Social — you run the place, we'll run the feed",
    description:
      "A calm social-media tool for local businesses. Posts written in your voice, images made in Studio, published to Facebook and Instagram on schedule.",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Posterboy Social — you run the place, we'll run the feed",
    description:
      "A calm social-media tool for local businesses. Posts in your voice, published to Facebook and Instagram on schedule.",
  },
};

// Accurate structured data only: real name/url/pricing from the verified
// pricing config. No ratings, reviews, or counts — none exist yet.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Posterboy Social",
      url: SITE_URL,
      logo: `${SITE_URL}/opengraph-image`,
      description:
        "Posterboy Social is a calm social-media tool for local businesses: captions in your voice, images from Posterboy Studio, and scheduled publishing to Facebook and Instagram.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Posterboy",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Social media management for local businesses. Brand-voice captions, Studio image generation, a simple approval calendar, and scheduled publishing to Facebook and Instagram.",
      offers: [
        {
          "@type": "Offer",
          name: "Solo",
          price: "99",
          priceCurrency: "USD",
          description: "$99/mo, or $79/mo billed annually ($948/yr). One user, three social profiles.",
        },
        {
          "@type": "Offer",
          name: "Command",
          price: "249",
          priceCurrency: "USD",
          description: "$249/mo base plus $39 per location. Multi-location rollups and centralized approvals.",
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, code-owned JSON — no user input flows into this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <MarketingSite />
    </>
  );
}
