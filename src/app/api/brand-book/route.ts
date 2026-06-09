import { NextRequest, NextResponse } from "next/server";
import { LocationRole } from "@prisma/client";
import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import { findTenantBrandBook, saveBrandBookForLocation } from "@/lib/brand-book-db";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { handleRouteError } from "@/lib/route-errors";

function isBrandBook(value: unknown): value is BrandBook {
  if (!value || typeof value !== "object") return false;
  const book = value as BrandBook;
  return Boolean(book.identity && book.palette && book.voice);
}

function hasMinimumRole(
  actual: LocationRole | null,
  required: LocationRole,
): boolean {
  const rank: Record<LocationRole, number> = {
    LOCATION_VIEWER: 0,
    LOCATION_EDITOR: 1,
    LOCATION_ADMIN: 2,
  };

  return rank[actual ?? "LOCATION_VIEWER"] >= rank[required];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");

    return await withTenantDb(auth, async (tx) => {
      if (locationId) {
        const access = await resolveAccess(auth.userId, locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const summary = await findTenantBrandBook(
        tx,
        auth.tenantId,
        locationId,
      );
      return NextResponse.json(summary);
    });
  } catch (error) {
    return handleRouteError("api.brand-book.GET", error);
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

    return await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess || !hasMinimumRole(access.role, "LOCATION_EDITOR")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const brandBook = await saveBrandBookForLocation(tx, auth.tenantId, locationId, {
        brandBook: body.brandBook as BrandBook,
        onboardingAnswers,
      });

      return NextResponse.json({
        hasBrandBook: true,
        locationId,
        brandBook,
      });
    });
  } catch (error) {
    return handleRouteError("api.brand-book.PUT", error);
  }
}
