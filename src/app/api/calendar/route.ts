import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    const access = await resolveAccess(auth.userId, locationId);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const events = await db.calendarEvent.findMany({
      where: { organizationId: auth.organizationId, locationId },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
