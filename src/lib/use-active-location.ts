"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDashboardLocations,
  formatDashboardApiMessage,
  type DashboardLocationRecord,
} from "@/lib/dashboard-api";
import {
  getStoredActiveLocationId,
  setStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";

export interface ActiveLocationState {
  locationId: string | null;
  locations: DashboardLocationRecord[];
  setLocationId: (id: string) => void;
  loading: boolean;
  error: string | null;
}

// Resolves the active location for the current tenant. Every data-scoped
// dashboard page needs a locationId — even solo/single-location plans where
// the LocationSwitcher UI is hidden. This hook guarantees one is resolved and
// persisted (via dashboard-browser-state) independent of any switcher UI, and
// stays in sync across components through the shared location-change event.
export function useActiveLocation(): ActiveLocationState {
  const [locations, setLocations] = useState<DashboardLocationRecord[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const next = await fetchDashboardLocations();
        if (cancelled) return;
        setLocations(next);

        const stored = getStoredActiveLocationId();
        const valid = stored && next.some((l) => l.id === stored) ? stored : null;
        const resolved = valid ?? next[0]?.id ?? null;
        if (resolved) {
          setStoredActiveLocationId(resolved);
          setLocationId(resolved);
        } else {
          setLocationId(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(formatDashboardApiMessage(err, "Could not load locations."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const unsubscribe = onStoredActiveLocationChange(() => {
      const next = getStoredActiveLocationId();
      if (next) setLocationId(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setLocation = useCallback((id: string) => {
    setStoredActiveLocationId(id);
    setLocationId(id);
  }, []);

  return { locationId, locations, setLocationId: setLocation, loading, error };
}
