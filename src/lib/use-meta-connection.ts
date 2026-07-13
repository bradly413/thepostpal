"use client";

import { useCallback, useEffect, useState } from "react";
import type { MetaConnectionPublic } from "@/lib/meta-connection-types";
import {
  disconnectDashboardMetaConnection,
  fetchDashboardMetaConnection,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import { useActiveLocation } from "@/lib/use-active-location";

export function useMetaConnection() {
  const { locationId, loading: locationLoading } = useActiveLocation();
  const [meta, setMeta] = useState<MetaConnectionPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (overrideLocationId?: string | null) => {
    const activeLocationId =
      overrideLocationId === undefined ? locationId : overrideLocationId;

    if (!activeLocationId) {
      setMeta(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const connection = await fetchDashboardMetaConnection(activeLocationId);
      setMeta(connection);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load Meta connection."));
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const disconnect = useCallback(async () => {
    if (!locationId) return;
    await disconnectDashboardMetaConnection(locationId);
    setMeta(null);
  }, [locationId]);

  useEffect(() => {
    if (locationLoading) return;
    void load(locationId);
  }, [load, locationId, locationLoading]);

  return {
    meta,
    loading: locationLoading || loading,
    error,
    reload: load,
    disconnect,
  };
}
