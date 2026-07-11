"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import UpgradeToCommandButton from "@/components/billing/UpgradeToCommandButton";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlan } from "@/components/dashboard/PlanProvider";
import {
  EmptyState,
  ErrorState,
  LocationGate,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  createDashboardLocation,
  fetchDashboardMe,
  fetchDashboardPosts,
  fetchLocationMetaSummary,
  formatDashboardApiMessage,
  type LocationMetaSummaryRow,
} from "@/lib/dashboard-api";
import { BrandMetaConnectionRow } from "@/components/dashboard/BrandMetaConnectionRow";
import { countPostsByLocation } from "@/lib/dashboard-post-helpers";
import { useActiveLocation } from "@/lib/use-active-location";
import { GROWTH, HOUSE_ACCOUNT } from "@/lib/posterboy-copy";

export default function OrganizationPage() {
  return (
    <Suspense>
      <OrganizationContent />
    </Suspense>
  );
}

function OrganizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { features, loading: planLoading } = usePlan();
  const {
    locations,
    locationId,
    setLocationId,
    loading: locationLoading,
    error: locationError,
    refresh: refreshLocations,
  } = useActiveLocation();
  const [me, setMe] = useState<Awaited<ReturnType<typeof fetchDashboardMe>> | null>(null);
  const [newName, setNewName] = useState("");
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [metaSummary, setMetaSummary] = useState<LocationMetaSummaryRow[]>([]);
  const [metaNotice, setMetaNotice] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const loadMetaSummary = useCallback(async () => {
    try {
      const rows = await fetchLocationMetaSummary();
      setMetaSummary(rows);
    } catch {
      setMetaSummary([]);
    }
  }, []);

  useEffect(() => {
    const connected = searchParams.get("meta_connected");
    const error = searchParams.get("meta_error");
    if (connected) {
      setMetaNotice("Facebook and Instagram connected for this brand.");
      void loadMetaSummary();
      router.replace("/dashboard/organization");
    }
    if (error) {
      setMetaError(decodeURIComponent(error.replace(/\+/g, " ")));
      router.replace("/dashboard/organization");
    }
  }, [searchParams, router, loadMetaSummary]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profile, posts] = await Promise.all([
        fetchDashboardMe(),
        fetchDashboardPosts(null),
      ]);
      setMe(profile);
      setDraftCounts(countPostsByLocation(posts));
      await loadMetaSummary();
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load organization details."));
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [loadMetaSummary]);

  useEffect(() => {
    if (!planLoading && features.locationRollup) void load();
  }, [load, planLoading, features.locationRollup]);

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await createDashboardLocation({ name: newName.trim() });
      setNewName("");
      await refreshLocations();
      await load();
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not add that location."));
    } finally {
      setAdding(false);
    }
  }

  const org = me?.organization;

  if (planLoading) {
    return (
      <div className="pb-app">
        <SkeletonText className="h-32 w-full rounded-[24px]" />
      </div>
    );
  }

  if (!features.locationRollup) {
    return (
      <div className="pb-app">
        <div className="pb-app-header">
          <h1>Channels</h1>
          <p>Multi-location management is part of Command.</p>
        </div>
        <EmptyState
          title="Upgrade to Command"
          sub="Manage multiple locations, roll-up reporting, and shared brand systems from one workspace."
          action={<UpgradeToCommandButton label="View Command pricing" />}
        />
      </div>
    );
  }

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>Organization</h1>
          <p>{HOUSE_ACCOUNT.headline}</p>
          <p className="text-sm opacity-70 mt-1">{HOUSE_ACCOUNT.localEnough}</p>
        </div>
        <LocationSwitcher value={locationId ?? null} onChange={setLocationId} />
      </div>

      <LocationGate
        loading={locationLoading}
        error={locationError}
        locationId={locationId ?? locations[0]?.id ?? null}
        onRetry={() => void refreshLocations()}
      >
        {loading ? (
          <div className="space-y-4 mb-8">
            <SkeletonText className="h-24 w-full" />
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
              <p className="text-lg font-semibold mt-1">{org.name}</p>
              <p className="text-sm opacity-60">
                {org.businessType} · {locations.length} location
                {locations.length !== 1 ? "s" : ""}
              </p>
              {org.website ? <p className="text-sm opacity-50 mt-1">{org.website}</p> : null}
            </div>

            <h2 className="text-sm uppercase tracking-widest opacity-50 mb-3">Brands &amp; channels</h2>
            <p className="text-sm text-black/55 mb-4 max-w-2xl">
              Connect each brand to its own Facebook Page. Switch brands in the sidebar — not a
              channel grid.
            </p>

            {metaNotice ? (
              <div className="mb-4 rounded-xl border border-[#1f9d4d]/25 bg-[#1f9d4d]/10 px-4 py-3 text-sm text-[#1f9d4d]">
                {metaNotice}
              </div>
            ) : null}
            {metaError ? (
              <div className="mb-4 rounded-xl border border-[#ee2532]/25 bg-[#ee2532]/10 px-4 py-3 text-sm text-[#ee2532]">
                {metaError}
              </div>
            ) : null}

            {locations.length === 0 ? (
              <EmptyState
                title="No locations yet"
                sub="Add your first location to start scheduling content."
              />
            ) : (
              <div className="pb-draft-list mb-8">
                {(metaSummary.length ? metaSummary : locations.map((loc) => ({
                  locationId: loc.id,
                  locationName: loc.name,
                  connection: null,
                }))).map((row) => (
                  <BrandMetaConnectionRow
                    key={row.locationId}
                    row={row}
                    onChanged={() => void loadMetaSummary()}
                  />
                ))}
              </div>
            )}

            <h2 className="text-sm uppercase tracking-widest opacity-50 mb-3 mt-2">Queue snapshot</h2>
            {locations.length === 0 ? null : (
              <div className="pb-draft-list mb-8">
                {locations.map((loc) => (
                  <article key={loc.id} className="pb-draft-card">
                    <div className="flex-1">
                      <p className="font-medium">{loc.name}</p>
                      <p className="text-sm opacity-60">{draftCounts[loc.id] ?? 0} posts in queue</p>
                    </div>
                    <button
                      type="button"
                      className="pb-btn-secondary text-sm"
                      onClick={() => setLocationId(loc.id)}
                    >
                      Switch
                    </button>
                  </article>
                ))}
              </div>
            )}

            <form onSubmit={handleAddLocation} className="flex gap-2 mb-8 max-w-md">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New location name"
                className="pb-field flex-1 text-sm"
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
      </LocationGate>
    </div>
  );
}
