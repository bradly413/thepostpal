"use client";

import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import {
  fetchDashboardBrandBook,
  fetchDashboardLocations,
  saveDashboardBrandBook,
} from "@/lib/dashboard-api";
import {
  cacheStoredBrandBook,
  cacheStoredOnboardingAnswers,
  markOnboardingComplete,
} from "@/lib/onboarding-brand-sync";
import { setStoredActiveLocationId } from "@/lib/dashboard-browser-state";

async function resolveBrandBookLocationId(): Promise<string | null> {
  const locations = await fetchDashboardLocations();
  const active = locations.find((l) => l.status === "ACTIVE");
  return active?.id ?? locations[0]?.id ?? null;
}

/** Persist brand book to the tenant's primary location and refresh local cache. */
export async function persistBrandBookToWorkspace(input: {
  brandBook: BrandBook;
  onboardingAnswers?: OnboardingAnswers;
  locationId?: string | null;
}): Promise<{ locationId: string }> {
  const locationId = input.locationId ?? (await resolveBrandBookLocationId());
  if (!locationId) {
    throw new Error("No workspace location found. Finish signup and try again.");
  }

  await saveDashboardBrandBook({
    locationId,
    brandBook: input.brandBook,
    onboardingAnswers: input.onboardingAnswers,
  });

  cacheStoredBrandBook(input.brandBook);
  if (input.onboardingAnswers) {
    cacheStoredOnboardingAnswers(input.onboardingAnswers);
  }
  markOnboardingComplete();
  setStoredActiveLocationId(locationId);

  return { locationId };
}

export async function fetchHasBrandBookFromApi(): Promise<boolean> {
  const data = await fetchDashboardBrandBook();
  if (data.hasBrandBook && data.brandBook) {
    cacheStoredBrandBook(data.brandBook);
    return true;
  }
  return false;
}
