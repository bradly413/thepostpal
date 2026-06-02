import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { requireLocationAccess } from "@/lib/location-api";

interface Params {
  params: Promise<{ id: string; userId: string }>;
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN", dbClient: tx });
      await tx.locationMembership.delete({
        where: {
          locationId_userId: {
            locationId: id,
            userId,
          },
        },
      });
      return NextResponse.json({ success: true });
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
