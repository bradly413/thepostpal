import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { syncLocationBilling } from "@/lib/location-billing";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "location";
}

export async function GET() {
  try {
    const auth = await requireAuthContext();
    const memberships = await db.locationMembership.findMany({
      where: {
        userId: auth.userId,
        location: { organizationId: auth.organizationId },
      },
      include: {
        location: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      locations: memberships.map((m) => ({
        ...m.location,
        membershipRole: m.role,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { id: auth.organizationId },
      select: { plan: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const existingCount = await db.location.count({
      where: { organizationId: auth.organizationId, status: { not: "ARCHIVED" } },
    });

    const singleLocationPlans = new Set(["solo", "shop", "press", "studio"]);
    if (singleLocationPlans.has(org.plan) && existingCount >= 1) {
      return NextResponse.json(
        { error: "Upgrade required to add more locations" },
        { status: 402 },
      );
    }

    const baseSlug = slugify(typeof body.slug === "string" ? body.slug : name);
    let slug = baseSlug;
    let i = 2;
    while (
      await db.location.findFirst({
        where: { organizationId: auth.organizationId, slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${i}`;
      i += 1;
    }

    const created = await db.location.create({
      data: {
        organizationId: auth.organizationId,
        name,
        slug,
        status: "ACTIVE",
        city: typeof body.city === "string" ? body.city : null,
        state: typeof body.state === "string" ? body.state : null,
        country: typeof body.country === "string" ? body.country : null,
        timeZone: typeof body.timeZone === "string" && body.timeZone ? body.timeZone : "America/Chicago",
      },
    });

    await db.locationMembership.create({
      data: {
        locationId: created.id,
        userId: auth.userId,
        role: "LOCATION_ADMIN",
      },
    });

    await db.approvalRule.create({
      data: {
        locationId: created.id,
        requiresApproval: false,
        reviewerUserIds: [],
        minApprovers: 1,
      },
    });

    const billingSync = await syncLocationBilling(auth.organizationId);

    return NextResponse.json({ location: created, billingSync }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
