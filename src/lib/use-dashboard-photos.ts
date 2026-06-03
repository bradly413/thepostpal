"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDashboardPhoto,
  fetchDashboardPhotos,
  formatDashboardApiMessage,
  type DashboardPhotoRecord,
} from "@/lib/dashboard-api";
import { uploadDashboardImage } from "@/lib/dashboard-upload";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";

export interface DashboardDisplayPhoto {
  id: string;
  src: string;
  name: string;
  pending?: boolean;
}

function toDisplay(record: DashboardPhotoRecord): DashboardDisplayPhoto {
  return { id: record.id, src: record.url, name: record.alt || "Photo" };
}

export function useDashboardPhotos(locationId?: string | null) {
  const [photos, setPhotos] = useState<DashboardDisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeLocationId =
    locationId === undefined ? getStoredActiveLocationId() : locationId;

  const load = useCallback(async () => {
    if (!activeLocationId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const records = await fetchDashboardPhotos(activeLocationId);
      setPhotos(records.map(toDisplay));
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load photos."));
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [activeLocationId]);

  const uploadAndCreate = useCallback(
    async (file: File): Promise<DashboardDisplayPhoto> => {
      if (!activeLocationId) {
        throw new Error("Select a workspace location first.");
      }
      const url = await uploadDashboardImage(file);
      const created = await createDashboardPhoto({
        locationId: activeLocationId,
        url,
        mimeType: file.type,
        alt: file.name,
      });
      const display = toDisplay(created);
      setPhotos((prev) => [display, ...prev]);
      return display;
    },
    [activeLocationId],
  );

  useEffect(() => {
    void load();
    return onStoredActiveLocationChange(() => {
      void load();
    });
  }, [load]);

  return { photos, loading, error, reload: load, uploadAndCreate, locationId: activeLocationId };
}
