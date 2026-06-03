"use client";

import { useEffect, useState } from "react";
import {
  fetchDashboardLocations,
  formatDashboardApiMessage,
  type DashboardLocationRecord,
} from "@/lib/dashboard-api";
import {
  getStoredActiveLocationId,
  setStoredActiveLocationId,
} from "@/lib/dashboard-browser-state";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";

interface LocationSwitcherProps {
  value?: string | null;
  onChange?: (locationId: string) => void;
}

export default function LocationSwitcher({ value, onChange }: LocationSwitcherProps) {
  // Multi-location is a Command-tier capability. Solo/single-location plans
  // never see the switcher — this is the single chokepoint so every consumer
  // page is gated regardless of whether it wraps the component. While the
  // plan resolves, features defaults to streamlined (no enterprise flash).
  const features = usePlanFeatures();
  const [locations, setLocations] = useState<DashboardLocationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(value ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const nextLocations = await fetchDashboardLocations();
        if (cancelled) return;
        setLocations(nextLocations);

        const preferred = value ?? getStoredActiveLocationId() ?? nextLocations[0]?.id ?? null;
        if (preferred) {
          setActiveId(preferred);
          setStoredActiveLocationId(preferred);
          onChange?.(preferred);
        }
      } catch (err) {
        if (cancelled) return;
        setError(formatDashboardApiMessage(err, "Could not load locations."));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [onChange, value]);

  useEffect(() => {
    if (value !== undefined) {
      setActiveId(value);
    }
  }, [value]);

  // Hard plan gate — Solo/single-location plans never render the switcher.
  if (!features.multiLocation) return null;

  if (loading) {
    return (
      <div className="pb-location-switcher">
        <div className="h-10 w-[180px] animate-pulse rounded-full border border-black/10 bg-black/[0.04]" />
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-[#8f6a64]">{error}</div>;
  }

  if (locations.length <= 1) return null;

  return (
    <label className="pb-location-switcher">
      <span className="sr-only">Location</span>
      <select
        value={activeId ?? locations[0]?.id ?? ""}
        onChange={(e) => {
          setStoredActiveLocationId(e.target.value);
          setActiveId(e.target.value);
          onChange?.(e.target.value);
        }}
        className="pb-location-select"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </label>
  );
}
