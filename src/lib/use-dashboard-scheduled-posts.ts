"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDashboardPosts,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import { mapRecordToCalendarPost } from "@/lib/scheduled-post-mappers";
import type { ScheduledPost } from "@/lib/schedule-store";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";

export function useDashboardScheduledPosts() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const locationId = getStoredActiveLocationId();
      const records = await fetchDashboardPosts(locationId);
      setPosts(records.map(mapRecordToCalendarPost));
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load scheduled posts."));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return onStoredActiveLocationChange(() => {
      void load();
    });
  }, [load]);

  return { posts, loading, error, reload: load };
}
