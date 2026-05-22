"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LocationSwitcher from "@/components/LocationSwitcher";
import { countByStatus, getDrafts } from "@/lib/drafts-store";
import { ensureDashboardData } from "@/lib/dashboard-data-init";
import { getActiveLocation } from "@/lib/organization-store";
import { ANALYTICS } from "@/lib/posterboy-copy";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    approved: 0,
    published: 0,
    needsReview: 0,
    consistency: 0,
    draftToApproval: 0,
  });

  useEffect(() => {
    ensureDashboardData();
    const loc = getActiveLocation();
    const counts = countByStatus(loc?.id);
    const all = getDrafts().filter((d) => !loc?.id || d.locationId === loc.id);
    const reviewed = all.filter((d) => d.status !== "draft").length;
    const approved = counts.approved + counts.scheduled + counts.published;
    setStats({
      approved,
      published: counts.published,
      needsReview: counts.needs_review + counts.needs_revision,
      consistency: all.length > 0 ? Math.round((approved / all.length) * 100) : 0,
      draftToApproval: reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0,
    });
  }, []);

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>Workflow metrics</h1>
          <p>Draft and approval counts from this browser — not Meta reach (beta).</p>
        </div>
        <LocationSwitcher />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Posts approved", value: stats.approved },
          { label: "Posts published", value: stats.published },
          { label: "Awaiting review", value: stats.needsReview },
          { label: "Consistency", value: `${stats.consistency}%` },
          { label: "Draft-to-approval", value: `${stats.draftToApproval}%` },
          {
            label: "Time saved (est.)",
            value: `${Math.max(1, Math.min(14, stats.approved * 2))} hrs`,
          },
        ].map((m) => (
          <div key={m.label} className="pb-draft-card" style={{ gridTemplateColumns: "1fr" }}>
            <p className="text-xs uppercase tracking-widest opacity-50">{m.label}</p>
            <p className="text-2xl mt-2 font-serif" style={{ fontFamily: "var(--font-instrument-serif)" }}>{m.value}</p>
          </div>
        ))}
      </div>

      <section className="pb-section-narrow" style={{ padding: 0 }}>
        <h2 className="font-serif text-xl mb-3" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          {ANALYTICS.worthRepeating}
        </h2>
        <ul className="pb-pricing-features">
          <li>Weekly hours and availability</li>
          <li>Seasonal offers, stated plainly</li>
          <li>The occasional photo with a dog in frame</li>
        </ul>
        <p className="mt-6 opacity-70">{ANALYTICS.postsDidJob}</p>
      </section>

      <p className="mt-8">
        <Link href="/pricing#studio" className="pb-btn-secondary text-sm inline-flex">
          Ask about Studio
        </Link>
      </p>
    </div>
  );
}
