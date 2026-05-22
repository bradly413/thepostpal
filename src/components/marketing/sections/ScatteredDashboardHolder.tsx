"use client";

import DashboardPortalPreview from "@/components/marketing/DashboardPortalPreview";

type Props = {
  alt: string;
};

/**
 * Focal scattered card — 16:9 portal preview; scales to fullscreen on scroll convergence.
 */
export default function ScatteredDashboardHolder({ alt }: Props) {
  return (
    <div className="scattered-dashboard-holder" role="img" aria-label={alt}>
      <DashboardPortalPreview />
    </div>
  );
}
