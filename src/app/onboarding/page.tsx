"use client";

import dynamic from "next/dynamic";

// WebGL + GSAP Observer must run client-only.
const BrandArchitect = dynamic(
  () => import("@/components/onboarding/BrandArchitect"),
  { ssr: false },
);

export default function OnboardingPage() {
  return <BrandArchitect />;
}
