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
import { useActiveLocation } from "@/lib/use-active-location";

export function useBrandBook() {
  const { locationId: activeLocationId, loading: locationLoading } = useActiveLocation();
  const [book, setBook] = useState<BrandBook | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingAnswers | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferredLocationId?: string | null) => {
    const resolved =
      preferredLocationId === undefined ? activeLocationId : preferredLocationId;

    if (!resolved) {
      setBook(null);
      setOnboardingAnswers(null);
      setLocationId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardBrandBook(resolved);
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
  }, [activeLocationId]);

  useEffect(() => {
    if (locationLoading) return;
    void load(activeLocationId);
  }, [load, activeLocationId, locationLoading]);

  return {
    book,
    locationId,
    onboardingAnswers,
    loading: locationLoading || loading,
    error,
    reload: load,
  };
}
