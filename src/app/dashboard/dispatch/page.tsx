"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import LocationSwitcher from "@/components/LocationSwitcher";
import { useActiveLocation } from "@/lib/use-active-location";
import {
  fetchDashboardPosts,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import { splitScheduledFor } from "@/lib/scheduled-post-mappers";
import type { Draft, DraftStatus } from "@/lib/posterboy-types";
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

function toDispatchDraft(
  post: Awaited<ReturnType<typeof fetchDashboardPosts>>[number],
): Draft {
  const { date, time } = splitScheduledFor(post.scheduledFor);
  return {
    id: post.id,
    locationId: post.locationId || "",
    copy: post.copy,
    platforms: post.platforms,
    scheduledDate: date || undefined,
    scheduledTime: time,
    status: post.status as DraftStatus,
    note: post.note || undefined,
    reviewerNotes: post.reviewerNotes || undefined,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export default function DispatchPage() {
  const { locationId } = useActiveLocation();
  const [byDate, setByDate] = useState<Record<string, Draft[]>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!locationId) {
      setByDate({});
      return;
    }
    try {
      setError(null);
      const posts = await fetchDashboardPosts(locationId);
      const scheduled = posts.filter(
        (p) =>
          p.status === "scheduled" ||
          p.status === "approved" ||
          p.status === "published",
      );
      const map: Record<string, Draft[]> = {};
      getWeekDates().forEach((date) => {
        map[date] = scheduled
          .map(toDispatchDraft)
          .filter((d) => d.scheduledDate === date);
      });
      setByDate(map);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load dispatch."));
    }
  }, [locationId]);

  useEffect(() => {
    void load();
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

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

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
                        <Link href={`/dashboard/calendar`}>Calendar</Link>
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
