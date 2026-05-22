import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLocationAccess } from "@/lib/location-api";

interface Params {
  params: Promise<{ id: string; userId: string }>;
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  try {
    await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN" });
    await db.locationMembership.delete({
      where: {
        locationId_userId: {
          locationId: id,
          userId,
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
