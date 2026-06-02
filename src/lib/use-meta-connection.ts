"use client";

import { useCallback, useEffect, useState } from "react";
import type { MetaConnectionPublic } from "@/lib/meta-connection-types";
import {
  disconnectDashboardMetaConnection,
  fetchDashboardMetaConnection,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";

export function useMetaConnection() {
  const [meta, setMeta] = useState<MetaConnectionPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (locationId?: string | null) => {
    const activeLocationId =
      locationId === undefined ? getStoredActiveLocationId() : locationId;

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
  }, []);

  const disconnect = useCallback(async () => {
    const activeLocationId = getStoredActiveLocationId();
    if (!activeLocationId) return;
    await disconnectDashboardMetaConnection(activeLocationId);
    setMeta(null);
  }, []);

  useEffect(() => {
    void load();
    return onStoredActiveLocationChange(() => {
      void load();
    });
  }, [load]);

  return { meta, loading, error, reload: load, disconnect };
}
