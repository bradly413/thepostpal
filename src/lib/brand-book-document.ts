import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";

/** Stored in `Location.brandVoiceJson` (full brand book + optional onboarding answers). */
export interface LocationBrandDocument {
  version: 1;
  brandBook: BrandBook;
  onboardingAnswers?: OnboardingAnswers;
}

const LEGACY_TONE_KEYS = new Set(["tone", "audience", "services", "offers", "recurringThemes"]);

function isLegacyVoiceSummary(
  value: unknown,
): value is { tone?: string[]; audience?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every((k) => LEGACY_TONE_KEYS.has(k));
}

export function isLocationBrandDocument(value: unknown): value is LocationBrandDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const doc = value as LocationBrandDocument;
  return doc.version === 1 && Boolean(doc.brandBook?.identity && doc.brandBook?.palette);
}

/** Raw `brandVoiceJson` may be a legacy tone summary or a full BrandBook (pre-version wrapper). */
export function parseLocationBrandDocument(
  raw: unknown,
): LocationBrandDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (isLocationBrandDocument(raw)) return raw;

  const obj = raw as Record<string, unknown>;
  if (obj.version === 1 && obj.brandBook) {
    return isLocationBrandDocument(raw) ? (raw as LocationBrandDocument) : null;
  }

  if (isLegacyVoiceSummary(raw)) return null;

  if (obj.identity && obj.palette && obj.voice) {
    return {
      version: 1,
      brandBook: raw as BrandBook,
    };
  }

  return null;
}

export function locationHasBrandBook(raw: unknown): boolean {
  return parseLocationBrandDocument(raw) !== null;
}

export function buildLocationBrandDocument(input: {
  brandBook: BrandBook;
  onboardingAnswers?: OnboardingAnswers;
}): LocationBrandDocument {
  return {
    version: 1,
    brandBook: input.brandBook,
    ...(input.onboardingAnswers ? { onboardingAnswers: input.onboardingAnswers } : {}),
  };
}

/** Tone labels for dashboard home when only legacy JSON exists on the location. */
export function legacyToneFromBrandVoiceJson(
  raw: unknown,
): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  if (!isLegacyVoiceSummary(raw)) return [];
  const tone = (raw as { tone?: unknown }).tone;
  return Array.isArray(tone)
    ? tone.filter((t): t is string => typeof t === "string")
    : [];
}
