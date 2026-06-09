import type { BrandBook, OnboardingAnswers } from "./brand-book-schema";

const BRAND_BOOK_KEY = "postpal-brand-book";
const ONBOARDING_ANSWERS_KEY = "postpal-onboarding-answers";
const ONBOARDING_DONE_KEY = "posterboy-onboarding-complete";
const PENDING_VERTICAL_KEY = "postpal-pending-vertical-slug";

export function cacheStoredBrandBook(book: BrandBook): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BRAND_BOOK_KEY, JSON.stringify(book));
  } catch {
    /* quota */
  }
}

export function cacheStoredOnboardingAnswers(answers: OnboardingAnswers): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_ANSWERS_KEY, JSON.stringify(answers));
  } catch {
    /* quota */
  }
}

export function hasBrandBook(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(BRAND_BOOK_KEY));
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_DONE_KEY, "1");
}

export function getStoredBrandBook(): BrandBook | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRAND_BOOK_KEY);
    return raw ? (JSON.parse(raw) as BrandBook) : null;
  } catch {
    return null;
  }
}

export function getStoredOnboardingAnswers(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_ANSWERS_KEY);
    return raw ? (JSON.parse(raw) as OnboardingAnswers) : null;
  } catch {
    return null;
  }
}

export function cachePendingVerticalSlug(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_VERTICAL_KEY, slug);
  } catch {
    /* quota */
  }
}

export function getPendingVerticalSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_VERTICAL_KEY);
  } catch {
    return null;
  }
}

export function clearPendingVerticalSlug(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_VERTICAL_KEY);
  } catch {
    /* quota */
  }
}

/** Push a vertical picked during guest onboarding to the tenant record once authed. */
export async function syncPendingVerticalSlug(): Promise<boolean> {
  const slug = getPendingVerticalSlug();
  if (!slug) return false;
  const { updateDashboardVertical } = await import("@/lib/dashboard-api");
  try {
    await updateDashboardVertical(slug);
    clearPendingVerticalSlug();
    return true;
  } catch {
    return false;
  }
}

/** Cache brand book locally after API persistence; no localStorage org seeding. */
export function syncBrandBookToOrganization(book?: BrandBook | null): boolean {
  if (typeof window === "undefined") return false;
  const brand = book ?? getStoredBrandBook();
  if (!brand) return false;

  cacheStoredBrandBook(brand);
  markOnboardingComplete();
  return true;
}
