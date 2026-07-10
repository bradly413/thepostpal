"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  refresh: () => Promise<void>;
}

const ActiveLocationContext = createContext<ActiveLocationState | null>(null);

export function ActiveLocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<DashboardLocationRecord[]>([]);
  const [locationId, setLocationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await fetchDashboardLocations();
      setLocations(next);

      const stored = getStoredActiveLocationId();
      const valid = stored && next.some((l) => l.id === stored) ? stored : null;
      const resolved = valid ?? next[0]?.id ?? null;
      if (resolved) {
        setStoredActiveLocationId(resolved);
        setLocationIdState(resolved);
      } else {
        setLocationIdState(null);
      }
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load locations."));
      setLocations([]);
      setLocationIdState(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
          setLocationIdState(resolved);
        } else {
          setLocationIdState(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(formatDashboardApiMessage(err, "Could not load locations."));
        setLocations([]);
        setLocationIdState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const unsubscribe = onStoredActiveLocationChange(() => {
      const next = getStoredActiveLocationId();
      if (next) setLocationIdState(next);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setLocationId = useCallback((id: string) => {
    setStoredActiveLocationId(id);
    setLocationIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      locationId,
      locations,
      setLocationId,
      loading,
      error,
      refresh,
    }),
    [locationId, locations, setLocationId, loading, error, refresh],
  );

  return (
    <ActiveLocationContext.Provider value={value}>{children}</ActiveLocationContext.Provider>
  );
}

export function useActiveLocation(): ActiveLocationState {
  const ctx = useContext(ActiveLocationContext);
  if (!ctx) {
    throw new Error("useActiveLocation must be used within ActiveLocationProvider");
  }
  return ctx;
}
