"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  EmptyState,
  ErrorState,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  createDashboardLocation,
  fetchDashboardLocations,
  fetchDashboardMe,
  fetchDashboardPosts,
  formatDashboardApiMessage,
  type DashboardLocationRecord,
  type DashboardMeRecord,
} from "@/lib/dashboard-api";
import { countPostsByLocation } from "@/lib/dashboard-post-helpers";
import { setStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import { GROWTH, HOUSE_ACCOUNT } from "@/lib/posterboy-copy";

export default function OrganizationPage() {
  const [me, setMe] = useState<DashboardMeRecord | null>(null);
  const [locations, setLocations] = useState<DashboardLocationRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profile, locs, posts] = await Promise.all([
        fetchDashboardMe(),
        fetchDashboardLocations(),
        fetchDashboardPosts(null),
      ]);
      setMe(profile);
      setLocations(locs);
      setDraftCounts(countPostsByLocation(posts));
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load organization details."));
      setMe(null);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await createDashboardLocation({ name: newName.trim() });
      setNewName("");
      await load();
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not add that location."));
    } finally {
      setAdding(false);
    }
  }

  const org = me?.organization;

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>Organization</h1>
          <p>{HOUSE_ACCOUNT.headline}</p>
          <p className="text-sm opacity-70 mt-1">{HOUSE_ACCOUNT.localEnough}</p>
        </div>
        <LocationSwitcher onChange={() => void load()} />
      </div>

      {loading ? (
        <div className="space-y-4 mb-8">
          <SkeletonText className="h-24 w-full" />
          <SkeletonText className="h-16 w-full" />
          <SkeletonText className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !org ? (
        <EmptyState
          title="Organization not found"
          sub="Sign in again or contact support if this workspace should exist."
        />
      ) : (
        <>
          <div className="pb-draft-card mb-6" style={{ gridTemplateColumns: "1fr" }}>
            <p className="text-xs uppercase tracking-widest opacity-50">Organization</p>
            <p
              className="text-lg font-serif mt-1"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {org.name}
            </p>
            <p className="text-sm opacity-60">
              {org.businessType} · {locations.length} location
              {locations.length !== 1 ? "s" : ""}
            </p>
            {org.website ? (
              <p className="text-sm opacity-50 mt-1">{org.website}</p>
            ) : null}
          </div>

          <h2 className="text-sm uppercase tracking-widest opacity-50 mb-3">Locations</h2>
          {locations.length === 0 ? (
            <EmptyState
              title="No locations yet"
              sub="Add your first location to start scheduling content."
            />
          ) : (
            <div className="pb-draft-list mb-8">
              {locations.map((loc) => {
                const draftCount = draftCounts[loc.id] ?? 0;
                return (
                  <article key={loc.id} className="pb-draft-card">
                    <div className="flex-1">
                      <p className="font-medium">{loc.name}</p>
                      <p className="text-sm opacity-60">{draftCount} posts in queue</p>
                    </div>
                    <button
                      type="button"
                      className="pb-btn-secondary text-sm"
                      onClick={() => {
                        setStoredActiveLocationId(loc.id);
                        void load();
                      }}
                    >
                      Switch
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <form onSubmit={handleAddLocation} className="flex gap-2 mb-8 max-w-md">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New location name"
              className="flex-1 border border-black/15 px-3 py-2 bg-transparent text-sm"
              disabled={adding}
            />
            <button type="submit" className="pb-btn-primary text-sm" disabled={adding}>
              {adding ? "Adding…" : "Add location"}
            </button>
          </form>

          <section className="pb-proof-card">
            <h3 className="pb-display">Command</h3>
            <p className="mt-2">
              {GROWTH.oneBrandManyLocations} {GROWTH.noFreelancingCaption}
            </p>
            <Link href="/pricing#command" className="pb-btn-secondary inline-flex mt-4 text-sm">
              View Command pricing
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
