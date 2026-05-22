"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  getDraftsNeedingReview,
  pressDraft,
  approveAllDrafts,
  skipDraft,
} from "@/lib/drafts-store";
import { ensureDashboardData } from "@/lib/dashboard-data-init";
import { getActiveLocation } from "@/lib/organization-store";
import type { Draft } from "@/lib/posterboy-types";
import { CORE, MICROCOPY } from "@/lib/posterboy-copy";

function formatSchedule(draft: Draft): string {
  if (!draft.scheduledDate) return "Unscheduled";
  const d = new Date(draft.scheduledDate + "T12:00:00");
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${day} ${draft.scheduledTime ?? ""}`.trim();
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | undefined>();

  const load = useCallback(() => {
    ensureDashboardData();
    const loc = getActiveLocation();
    setLocationId(loc?.id);
    setDrafts(getDraftsNeedingReview(loc?.id));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("drafts-updated", load);
    window.addEventListener("org-updated", load);
    return () => {
      window.removeEventListener("drafts-updated", load);
      window.removeEventListener("org-updated", load);
    };
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handlePress(id: string) {
    pressDraft(id);
    showToast(MICROCOPY.saved);
    load();
  }

  function handleApproveAll() {
    const n = approveAllDrafts(locationId);
    showToast(n > 0 ? MICROCOPY.saved : MICROCOPY.emptyDrafts);
    load();
  }

  function handleSkip(id: string) {
    skipDraft(id);
    load();
  }

  const count = drafts.length;
  const headline =
    count === 0
      ? "Nothing awaiting review"
      : count === 1
        ? "One draft ready for review"
        : `${count} drafts ready for review`;

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{headline}</h1>
          <p>{CORE.weekDrafted}</p>
          <p className="text-sm opacity-70 mt-1">
            Five posts, three captions, one photo of the dog. {CORE.approveLeisure}
          </p>
        </div>
        <LocationSwitcher />
      </div>

      {count > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" className="pb-btn-primary text-sm py-2 px-4" onClick={handleApproveAll}>
            Approve all
          </button>
          <Link href="/dashboard/editor" className="pb-btn-secondary text-sm py-2 px-4">
            Send to editor
          </Link>
        </div>
      )}

      {count === 0 ? (
        <div className="pb-empty">{MICROCOPY.emptyDrafts}</div>
      ) : (
        <div className="pb-draft-list">
          {drafts.map((draft) => (
            <article key={draft.id} className="pb-draft-card">
              <div className="pb-draft-meta">{formatSchedule(draft)}</div>
              <div>
                <p className="pb-draft-copy">{draft.copy}</p>
                <div className="mt-2 flex gap-2 items-center">
                  <StatusBadge status={draft.status} />
                  {draft.platforms.map((p) => (
                    <span key={p} className="text-[10px] uppercase tracking-wide opacity-50">{p}</span>
                  ))}
                </div>
              </div>
              <div className="pb-draft-actions">
                <button type="button" className="pb-press-btn" onClick={() => handlePress(draft.id)}>
                  Press
                </button>
                <Link href={`/dashboard/editor?draft=${draft.id}`}>Edit</Link>
                <button type="button" onClick={() => handleSkip(draft.id)}>Skip</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}
