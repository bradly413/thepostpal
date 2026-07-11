import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { loadMetaBundlePublic } from "@/lib/meta-social-db";
import type { MetaConnectionPublic } from "@/lib/meta-connection-types";

export interface LocationMetaSummary {
  locationId: string;
  locationName: string;
  connection: MetaConnectionPublic | null;
}

/**
 * GET /api/social-connections/meta/summary
 * Meta connection status for every location the user can access.
 */
export async function GET() {
  try {
    const auth = await requireAuthContext();

    const rows = await withTenantDb(auth, async (tx) => {
      const memberships = await tx.locationMembership.findMany({
        where: { userId: auth.userId },
        select: { locationId: true },
      });
      const locationIds = memberships.map((m) => m.locationId);
      if (locationIds.length === 0) return [];

      const locations = await tx.location.findMany({
        where: { id: { in: locationIds }, organizationId: auth.tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      const summaries: LocationMetaSummary[] = [];
      for (const loc of locations) {
        let connection: MetaConnectionPublic | null = null;
        try {
          connection = await loadMetaBundlePublic(auth, tx, loc.id);
        } catch {
          connection = null;
        }
        summaries.push({
          locationId: loc.id,
          locationName: loc.name,
          connection,
        });
      }
      return summaries;
    });

    return NextResponse.json({ locations: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const dynamic = "force-dynamic";
