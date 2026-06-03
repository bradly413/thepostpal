import { NextRequest, NextResponse } from "next/server";
import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import { findTenantBrandBook, saveBrandBookForLocation } from "@/lib/brand-book-db";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { requireLocationAccess } from "@/lib/location-api";

function isBrandBook(value: unknown): value is BrandBook {
  if (!value || typeof value !== "object") return false;
  const book = value as BrandBook;
  return Boolean(book.identity && book.palette && book.voice);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");

    if (locationId) {
      await requireLocationAccess(locationId);
    }

    return await withTenantDb(auth, async (tx) => {
      const summary = await findTenantBrandBook(
        tx,
        auth.tenantId,
        locationId,
      );
      return NextResponse.json(summary);
    });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = (await request.json()) as {
      locationId?: unknown;
      brandBook?: unknown;
      onboardingAnswers?: unknown;
    };

    const locationId =
      typeof body.locationId === "string" ? body.locationId.trim() : "";
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }
    if (!isBrandBook(body.brandBook)) {
      return NextResponse.json({ error: "Invalid brand book payload" }, { status: 400 });
    }

    const onboardingAnswers =
      body.onboardingAnswers && typeof body.onboardingAnswers === "object"
        ? (body.onboardingAnswers as OnboardingAnswers)
        : undefined;

    await requireLocationAccess(locationId, { minimumRole: "LOCATION_EDITOR" });

    const brandBook = await withTenantDb(auth, async (tx) =>
      saveBrandBookForLocation(tx, auth.tenantId, locationId, {
        brandBook: body.brandBook as BrandBook,
        onboardingAnswers,
      }),
    );

    return NextResponse.json({
      hasBrandBook: true,
      locationId,
      brandBook,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_ROLE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
