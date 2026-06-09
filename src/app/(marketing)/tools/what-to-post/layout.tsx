import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What to post this week — free social media idea generator | Posterboy",
  description:
    "Stuck on what to post? Answer three questions about your business and get a calm, on-brand week of social media drafts in seconds. Free, no signup required.",
  alternates: {
    canonical: "/tools/what-to-post",
  },
  openGraph: {
    title: "What to post this week — free social media idea generator | Posterboy",
    description:
      "Answer three questions and get a calm, on-brand week of social media drafts in seconds. Free, no signup required.",
    url: "/tools/what-to-post",
    type: "website",
  },
};

export default function WhatToPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
