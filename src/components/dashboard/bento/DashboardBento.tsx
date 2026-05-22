"use client";

import { useCallback, useEffect, useState } from "react";
import "@/styles/dashboard-bento.css";
import BentoMenu from "./BentoMenu";
import BentoHero from "./BentoHero";
import BentoStats from "./BentoStats";
import BentoAiStudio from "./BentoAiStudio";
import BentoWeekProgress from "./BentoWeekProgress";
import BentoBrandTiles from "./BentoBrandTiles";
import {
  countByStatus,
  getDraftsNeedingReview,
  getScheduledDrafts,
  seedDemoDrafts,
} from "@/lib/drafts-store";
import { getActiveLocation, getOrganization, seedDemoOrganization } from "@/lib/organization-store";
import { getIssues, seedDemoIssues } from "@/lib/issues-store";

function loadSnapshot() {
  seedDemoOrganization();
  seedDemoDrafts();
  seedDemoIssues();
  const loc = getActiveLocation();
  const org = getOrganization();
  const locationId = loc?.id;
  const counts = countByStatus(locationId);
  const pending = getDraftsNeedingReview(locationId);
  const scheduled = getScheduledDrafts(locationId);
  const issues = getIssues().filter((i) => !locationId || i.locationId === locationId);

  const next = pending[0] ?? scheduled[0];
  const nextLabel = next
    ? next.copy.length > 48
      ? `${next.copy.slice(0, 48)}…`
      : next.copy
    : undefined;

  return {
    businessName: org?.name ?? loc?.name ?? "Your business",
    locationLabel: loc
      ? `${loc.name} · ${loc.socialChannels?.length ?? 0} channels`
      : "One location",
    counts: {
      dispatch: scheduled.length + counts.approved,
      issues: issues.filter((i) => i.status === "open").length,
      drafts: pending.length,
    },
    draftTotal: Object.values(counts).reduce((a, b) => a + b, 0),
    pendingReview: pending.length,
    approvedCount: counts.approved + counts.scheduled,
    totalThisWeek: pending.length + counts.approved + counts.scheduled + counts.published,
    nextLabel,
  };
}

export default function DashboardBento() {
  const [data, setData] = useState<ReturnType<typeof loadSnapshot> | null>(null);

  const refresh = useCallback(() => setData(loadSnapshot()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("drafts-updated", refresh);
    window.addEventListener("org-updated", refresh);
    return () => {
      window.removeEventListener("drafts-updated", refresh);
      window.removeEventListener("org-updated", refresh);
    };
  }, [refresh]);

  if (!data) {
    return (
      <div className="dbento dbento-stage">
        <p className="dbento-meta">Loading your week…</p>
      </div>
    );
  }

  const weekLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="dbento">
      <div className="dbento-stage">
        <header className="dbento-topbar">
          <span className="dbento-brand">
            poster<b>boy</b>
          </span>
          <span className="dbento-meta">This week · {weekLabel}</span>
        </header>

        <div className="dbento-grid">
          <div className="dbento-row dbento-row-top">
            <BentoMenu
              businessName={data.businessName}
              locationLabel={data.locationLabel}
              counts={data.counts}
            />
            <BentoHero pendingCount={data.pendingReview} nextLabel={data.nextLabel} />
            <BentoStats draftTotal={data.draftTotal} pendingReview={data.pendingReview} />
          </div>

          <div className="dbento-row dbento-row-bot">
            <BentoAiStudio />
            <BentoWeekProgress
              approvedCount={data.approvedCount}
              totalThisWeek={data.totalThisWeek}
            />
            <BentoBrandTiles />
          </div>
        </div>
      </div>
    </div>
  );
}
