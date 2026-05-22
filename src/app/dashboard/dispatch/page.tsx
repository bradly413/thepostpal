"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import LocationSwitcher from "@/components/LocationSwitcher";
import { getDrafts, getScheduledDrafts } from "@/lib/drafts-store";
import { ensureDashboardData } from "@/lib/dashboard-data-init";
import { getActiveLocation } from "@/lib/organization-store";
import type { Draft } from "@/lib/posterboy-types";
import { MICROCOPY, PRODUCT } from "@/lib/posterboy-copy";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getWeekDates(): string[] {
  const d = new Date();
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mon);
    date.setDate(mon.getDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

export default function DispatchPage() {
  const [byDate, setByDate] = useState<Record<string, Draft[]>>({});

  const load = useCallback(() => {
    ensureDashboardData();
    const loc = getActiveLocation();
    const scheduled = getScheduledDrafts(loc?.id);
    const approved = getDrafts().filter(
      (d) =>
        (d.status === "approved" || d.status === "scheduled") &&
        d.scheduledDate &&
        (!loc?.id || d.locationId === loc.id),
    );
    const all = [...scheduled, ...approved.filter((d) => !scheduled.find((s) => s.id === d.id))];
    const map: Record<string, Draft[]> = {};
    getWeekDates().forEach((date) => {
      map[date] = all.filter((d) => d.scheduledDate === date);
    });
    setByDate(map);
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

  const weekDates = getWeekDates();
  const hasAny = Object.values(byDate).some((d) => d.length > 0);

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{PRODUCT.dispatch}</h1>
          <p>What goes out, when, and where.</p>
        </div>
        <LocationSwitcher />
      </div>

      {!hasAny ? (
        <div className="pb-empty">{MICROCOPY.emptyDispatch}</div>
      ) : (
        <div className="grid gap-6">
          {weekDates.map((date, i) => {
            const items = byDate[date] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={date}>
                <h2 className="text-sm uppercase tracking-widest opacity-50 mb-3">{DAYS[i]}</h2>
                <div className="pb-draft-list">
                  {items.map((draft) => (
                    <article key={draft.id} className="pb-draft-card">
                      <div className="pb-draft-meta">{draft.scheduledTime ?? "—"}</div>
                      <div>
                        <p className="pb-draft-copy">{draft.copy}</p>
                        <div className="mt-2 flex gap-2">
                          <StatusBadge status={draft.status} />
                          {draft.platforms.map((p) => (
                            <span key={p} className="text-[10px] uppercase opacity-50">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="pb-draft-actions">
                        <Link href={`/dashboard/editor?draft=${draft.id}`}>Edit</Link>
                        <Link href={`/dashboard/drafts`}>Review</Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
