import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";

export async function GET() {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
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
        tx.location.findMany({
          where: { organizationId: auth.tenantId },
          select: { id: true, name: true, slug: true, status: true, updatedAt: true },
        }),
        tx.postApproval.groupBy({
          by: ["locationId"],
          where: {
            location: { organizationId: auth.tenantId },
            status: "PENDING_REVIEW",
          },
          _count: { _all: true },
        }),
        tx.scheduledPost.groupBy({
          by: ["locationId"],
          where: {
            organizationId: auth.tenantId,
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
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
