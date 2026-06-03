import type { Prisma } from "@prisma/client";
import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import {
  buildLocationBrandDocument,
  locationHasBrandBook,
  parseLocationBrandDocument,
} from "@/lib/brand-book-document";
import type { TenantDbClient } from "@/lib/db";

function voiceTraitsToTone(brandBook: BrandBook): string[] {
  const fromTraits = brandBook.voice?.traits?.map((t) => t.name).filter(Boolean) ?? [];
  if (fromTraits.length > 0) return fromTraits;
  return ["professional", "warm"];
}

function markUrlFromBook(brandBook: BrandBook): string | undefined {
  const variant = brandBook.mark?.variants?.find((v) => v.url?.trim());
  return variant?.url?.trim() || undefined;
}

function fontStackFromBook(brandBook: BrandBook): string | undefined {
  const display = brandBook.typography?.display?.family;
  const body = brandBook.typography?.body?.family;
  if (display && body) return `${display}, ${body}, system-ui, sans-serif`;
  return display || body || undefined;
}

async function upsertBrandKitAndVoice(
  tx: TenantDbClient,
  locationId: string,
  brandBook: BrandBook,
) {
  const tone = voiceTraitsToTone(brandBook);
  const logoUrl = markUrlFromBook(brandBook);
  const primaryColor = brandBook.palette?.ink?.hex;
  const secondaryColor = brandBook.palette?.signal?.hex;

  await tx.brandKit.upsert({
    where: { locationId },
    create: {
      locationId,
      logoUrl: logoUrl ?? null,
      primaryColor: primaryColor ?? null,
      secondaryColor: secondaryColor ?? null,
    },
    update: {
      logoUrl: logoUrl ?? undefined,
      primaryColor: primaryColor ?? undefined,
      secondaryColor: secondaryColor ?? undefined,
    },
  });

  await tx.brandVoiceProfile.upsert({
    where: { locationId },
    create: {
      locationId,
      tone,
      bannedPhrases: brandBook.voice?.weDontSay ?? [],
      preferredPhrases: brandBook.voice?.weSay ?? [],
      audience: brandBook.identity?.target ?? null,
      services: brandBook.identity?.title ?? null,
      offers: null,
      recurringThemes: brandBook.identity?.markets ?? [],
    },
    update: {
      tone,
      bannedPhrases: brandBook.voice?.weDontSay ?? [],
      preferredPhrases: brandBook.voice?.weSay ?? [],
      audience: brandBook.identity?.target ?? undefined,
      services: brandBook.identity?.title ?? undefined,
      recurringThemes: brandBook.identity?.markets ?? [],
    },
  });
}

export async function loadBrandBookForLocation(
  tx: TenantDbClient,
  organizationId: string,
  locationId: string,
): Promise<{
  brandBook: BrandBook | null;
  onboardingAnswers: OnboardingAnswers | null;
}> {
  const location = await tx.location.findFirst({
    where: { id: locationId, organizationId },
  });
  if (!location) {
    return { brandBook: null, onboardingAnswers: null };
  }

  const doc = parseLocationBrandDocument(location.brandVoiceJson);
  return {
    brandBook: doc?.brandBook ?? null,
    onboardingAnswers: doc?.onboardingAnswers ?? null,
  };
}

export async function saveBrandBookForLocation(
  tx: TenantDbClient,
  organizationId: string,
  locationId: string,
  input: {
    brandBook: BrandBook;
    onboardingAnswers?: OnboardingAnswers;
  },
): Promise<BrandBook> {
  const doc = buildLocationBrandDocument(input);
  const primaryColor = input.brandBook.palette?.ink?.hex;
  const accentColor = input.brandBook.palette?.signal?.hex;
  const fontStack = fontStackFromBook(input.brandBook);

  await tx.location.update({
    where: { id: locationId, organizationId },
    data: {
      brandVoiceJson: doc as unknown as Prisma.InputJsonValue,
      brandPrimaryColor: primaryColor ?? undefined,
      brandAccentColor: accentColor ?? undefined,
      brandFontStack: fontStack ?? undefined,
    },
  });

  await upsertBrandKitAndVoice(tx, locationId, input.brandBook);
  return input.brandBook;
}

export async function findTenantBrandBook(
  tx: TenantDbClient,
  organizationId: string,
  preferredLocationId?: string | null,
): Promise<{
  hasBrandBook: boolean;
  locationId: string | null;
  brandBook: BrandBook | null;
  onboardingAnswers: OnboardingAnswers | null;
}> {
  if (preferredLocationId) {
    const loaded = await loadBrandBookForLocation(
      tx,
      organizationId,
      preferredLocationId,
    );
    if (loaded.brandBook) {
      return {
        hasBrandBook: true,
        locationId: preferredLocationId,
        brandBook: loaded.brandBook,
        onboardingAnswers: loaded.onboardingAnswers,
      };
    }
  }

  const locations = await tx.location.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, brandVoiceJson: true },
  });

  for (const loc of locations) {
    if (!locationHasBrandBook(loc.brandVoiceJson)) continue;
    const doc = parseLocationBrandDocument(loc.brandVoiceJson)!;
    return {
      hasBrandBook: true,
      locationId: loc.id,
      brandBook: doc.brandBook,
      onboardingAnswers: doc.onboardingAnswers ?? null,
    };
  }

  return {
    hasBrandBook: false,
    locationId: null,
    brandBook: null,
    onboardingAnswers: null,
  };
}
