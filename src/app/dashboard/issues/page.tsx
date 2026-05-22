"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import LocationSwitcher from "@/components/LocationSwitcher";
import { getIssues, seedDemoIssues, getIssueStats } from "@/lib/issues-store";
import type { Issue } from "@/lib/posterboy-types";
import { PRODUCT } from "@/lib/posterboy-copy";

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);

  const load = useCallback(() => {
    seedDemoIssues();
    setIssues(getIssues());
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("issues-updated", load);
    window.addEventListener("drafts-updated", load);
    return () => {
      window.removeEventListener("issues-updated", load);
      window.removeEventListener("drafts-updated", load);
    };
  }, [load]);

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{PRODUCT.issues}</h1>
          <p>Weekly post bundles. One issue at a time.</p>
        </div>
        <LocationSwitcher />
      </div>

      {issues.length === 0 ? (
        <div className="pb-empty">No issues yet. The week will arrive.</div>
      ) : (
        <div className="pb-draft-list">
          {issues.map((issue) => {
            const stats = getIssueStats(issue);
            return (
              <article key={issue.id} className="pb-draft-card" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <h2 className="font-serif text-lg" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                    {issue.title}
                  </h2>
                  <p className="text-sm opacity-60 mt-1">
                    {issue.weekStart} — {issue.weekEnd}
                  </p>
                  <p className="text-sm mt-3">
                    {stats.total} drafts · {stats.approved} approved · {stats.scheduled} scheduled · {stats.needsReview} awaiting review
                  </p>
                </div>
                <div className="pb-draft-actions">
                  <Link href="/dashboard/drafts" className="pb-press-btn">
                    Review issue
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
