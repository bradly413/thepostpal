"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import {
  fetchDashboardBrandBook,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import {
  cacheStoredBrandBook,
  cacheStoredOnboardingAnswers,
} from "@/lib/onboarding-brand-sync";
import {
  getStoredActiveLocationId,
  onStoredActiveLocationChange,
} from "@/lib/dashboard-browser-state";

export function useBrandBook() {
  const [book, setBook] = useState<BrandBook | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingAnswers | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferredLocationId?: string | null) => {
    const activeLocationId =
      preferredLocationId === undefined
        ? getStoredActiveLocationId()
        : preferredLocationId;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardBrandBook(activeLocationId);
      setLocationId(data.locationId);
      setBook(data.brandBook);
      setOnboardingAnswers(data.onboardingAnswers ?? null);
      if (data.brandBook) {
        cacheStoredBrandBook(data.brandBook);
      }
      if (data.onboardingAnswers) {
        cacheStoredOnboardingAnswers(data.onboardingAnswers);
      }
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load brand book."));
      setBook(null);
      setOnboardingAnswers(null);
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

  return { book, locationId, onboardingAnswers, loading, error, reload: load };
}
