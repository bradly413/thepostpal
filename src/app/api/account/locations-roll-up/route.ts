import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const auth = await requireAuthContext();

    const org = await db.organization.findUnique({
      where: { id: auth.organizationId },
      select: { plan: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (org.plan !== "house_account") {
      return NextResponse.json(
        { error: "Multi-Location tier required" },
        { status: 402 },
      );
    }

    const [locations, pendingByLocation, scheduledByLocation] = await Promise.all([
      db.location.findMany({
        where: { organizationId: auth.organizationId },
        select: { id: true, name: true, slug: true, status: true, updatedAt: true },
      }),
      db.postApproval.groupBy({
        by: ["locationId"],
        where: {
          location: { organizationId: auth.organizationId },
          status: "PENDING_REVIEW",
        },
        _count: { _all: true },
      }),
      db.scheduledPost.groupBy({
        by: ["locationId"],
        where: {
          organizationId: auth.organizationId,
          status: { in: ["scheduled", "published"] },
        },
        _count: { _all: true },
      }),
    ]);

    const pendingMap = new Map(pendingByLocation.map((x) => [x.locationId, x._count._all]));
    const scheduledMap = new Map(scheduledByLocation.map((x) => [x.locationId, x._count._all]));

    return NextResponse.json({
      locations: locations.map((location) => ({
        ...location,
        pendingApprovals: pendingMap.get(location.id) ?? 0,
        totalScheduledOrPublished: scheduledMap.get(location.id) ?? 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
