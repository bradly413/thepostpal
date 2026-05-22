import type { BrandBook } from "./brand-book-schema";
import { createFromBrandIntake } from "./organization-store";

const BRAND_BOOK_KEY = "postpal-brand-book";
const ONBOARDING_DONE_KEY = "posterboy-onboarding-complete";

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

/** Map onboarding brand book into posterboy organization + location stores. */
export function syncBrandBookToOrganization(book?: BrandBook | null): boolean {
  if (typeof window === "undefined") return false;
  const brand = book ?? getStoredBrandBook();
  if (!brand) return false;

  const { identity, voice } = brand;
  const tone =
    voice?.traits?.map((t) => t.name.toLowerCase()) ??
    identity.target?.split(/[,\s]+/).filter(Boolean).slice(0, 4) ??
    ["professional", "local"];

  createFromBrandIntake({
    businessName: identity.name || "Your business",
    businessType: "real_estate",
    locationCount: 1,
    website: identity.website ?? "",
    services: identity.title || "Real estate services",
    audience: identity.target || identity.markets?.join(", ") || "",
    tonePreferences: tone.length > 0 ? tone : ["professional", "warm"],
    bannedPhrases: voice?.weDontSay ?? [],
    preferredPhrases: voice?.weSay ?? [],
    recurringOffers: "",
    seasonalMoments: identity.markets?.join(", ") ?? "",
    platforms: ["instagram", "facebook"],
    goals: ["look_alive", "leads"],
  });

  markOnboardingComplete();
  return true;
}
