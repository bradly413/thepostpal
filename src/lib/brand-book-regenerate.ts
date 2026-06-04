"use client";

import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import type { BrandEngineInput } from "@/lib/brand-engine-api";
import { fetchBrandEngine } from "@/lib/brand-engine-api";
import { getIndustry } from "@/lib/industries";
import {
  DRESS_CODE_TO_FONT_PAIRING,
  DRESS_CODE_TO_TONE,
  type DressCodeChoice,
} from "@/lib/onboarding-choices";
import { getStoredOnboardingAnswers } from "@/lib/onboarding-brand-sync";
import { persistBrandBookToWorkspace } from "@/lib/brand-book-client";
import { generateDashboardBrandBook } from "@/lib/dashboard-api";

const TONE_FROM_ENGINE: Record<string, OnboardingAnswers["tonePreference"]> = {
  "Warm & personal": "warm",
  "Polished & professional": "professional",
  "Bold & playful": "playful",
  "Refined & premium": "authoritative",
};

function toneFromBook(book: BrandBook): OnboardingAnswers["tonePreference"] {
  const hero = book.voice.hero.toLowerCase();
  if (hero.includes("data") || hero.includes("measured")) return "professional";
  if (hero.includes("fun") || hero.includes("adventure") || hero.includes("energy")) {
    return "playful";
  }
  if (hero.includes("authority") || hero.includes("precision")) return "authoritative";
  return "warm";
}

function mergeBrandEngineMission(
  dna: BrandEngineInput | null,
  mission?: string,
): string | undefined {
  const parts = [
    typeof dna?.niche === "string" ? dna.niche.trim() : "",
    typeof dna?.primaryTone === "string" ? dna.primaryTone.trim() : "",
    mission?.trim() ?? "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : undefined;
}

/**
 * Reconstruct generate payload from stored answers, brand book identity,
 * and optional Brand Engine DNA.
 */
export function buildRegenerateAnswers(
  book: BrandBook,
  stored?: OnboardingAnswers | null,
  brandEngine?: BrandEngineInput | null,
): OnboardingAnswers {
  const { identity } = book;
  const industryId = stored?.industry ?? identity.industry;
  const industry = getIndustry(industryId);

  const toneFromEngine =
    brandEngine?.primaryTone && TONE_FROM_ENGINE[brandEngine.primaryTone]
      ? TONE_FROM_ENGINE[brandEngine.primaryTone]
      : undefined;

  const dressCode = stored?.dressCode;
  const toneFromDress =
    dressCode && dressCode in DRESS_CODE_TO_TONE
      ? DRESS_CODE_TO_TONE[dressCode as DressCodeChoice]
      : undefined;

  const tonePreference =
    stored?.tonePreference ?? toneFromDress ?? toneFromEngine ?? toneFromBook(book);

  const traitLabel: Record<OnboardingAnswers["tonePreference"], string> = {
    warm: "Warm",
    professional: "Professional",
    playful: "Energetic",
    authoritative: "Premium",
  };

  const personalityTraits =
    stored?.personalityTraits?.length
      ? stored.personalityTraits
      : book.voice.traits.length > 0
        ? book.voice.traits.map((t) => t.name)
        : [traitLabel[tonePreference]];

  const contentFocus =
    stored?.contentFocus?.length
      ? stored.contentFocus
      : book.pillars.length > 0
        ? book.pillars.map((p) => p.name)
        : industry
          ? industry.contentFocus.slice(0, 4).map((c) => c.label)
          : ["Updates"];

  return {
    name: stored?.name ?? identity.name,
    company: stored?.company ?? identity.company ?? identity.brokerage,
    brokerage:
      industryId === "real-estate"
        ? stored?.brokerage ?? identity.brokerage ?? identity.company
        : undefined,
    industry: industryId,
    profession:
      stored?.profession ?? identity.profession ?? identity.title ?? industry?.defaultProfessionTitle,
    location: stored?.location ?? identity.location,
    markets:
      stored?.markets?.length
        ? stored.markets
        : identity.markets?.length
          ? identity.markets
          : [identity.location],
    targetClient: stored?.targetClient ?? identity.target ?? book.glance.whoItsFor,
    personalityTraits,
    tonePreference,
    contentFocus,
      mission: mergeBrandEngineMission(brandEngine ?? null, stored?.mission),
      dressCode: stored?.dressCode,
      greeting: stored?.greeting,
      compliment: stored?.compliment,
      fontPairing:
        stored?.fontPairing ??
        (dressCode && dressCode in DRESS_CODE_TO_FONT_PAIRING
          ? DRESS_CODE_TO_FONT_PAIRING[dressCode as DressCodeChoice]
          : undefined),
      voiceSamples: stored?.voiceSamples,
    antiVoice: stored?.antiVoice,
    logo: stored?.logo ?? book.mark.variants[0]?.url,
    headshot: stored?.headshot ?? identity.headshot,
    brandColors: stored?.brandColors,
    phone: stored?.phone ?? identity.phone,
    email: stored?.email ?? identity.email,
    website: stored?.website ?? identity.website,
    social: stored?.social ?? identity.social,
    experience: stored?.experience ?? identity.experience,
  };
}

export interface RegenerateBrandBookResult {
  brandBook: BrandBook;
  voice: "structured" | "fallback";
}

export async function regenerateAndPersistBrandBook(input: {
  book: BrandBook;
  locationId: string;
  onboardingAnswers?: OnboardingAnswers | null;
}): Promise<RegenerateBrandBookResult> {
  const brandEngine = (await fetchBrandEngine()) as BrandEngineInput | null;
  const cachedAnswers = getStoredOnboardingAnswers();
  const answers = buildRegenerateAnswers(
    input.book,
    input.onboardingAnswers ?? cachedAnswers,
    brandEngine,
  );

  const { brandBook, voice } = await generateDashboardBrandBook(answers);

  await persistBrandBookToWorkspace({
    brandBook,
    onboardingAnswers: answers,
    locationId: input.locationId,
  });

  return {
    brandBook,
    voice: voice === "structured" ? "structured" : "fallback",
  };
}
