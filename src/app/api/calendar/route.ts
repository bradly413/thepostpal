import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const locationId = request.nextUrl.searchParams.get("locationId");
      if (!locationId) {
        return NextResponse.json({ error: "locationId is required" }, { status: 400 });
      }

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const events = await tx.calendarEvent.findMany({
        where: { organizationId: auth.tenantId, locationId },
        orderBy: { startsAt: "asc" },
      });

      return NextResponse.json({ events });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const body = await request.json();

      const locationId = typeof body.locationId === "string" ? body.locationId : "";
      if (!locationId) {
        return NextResponse.json({ error: "locationId is required" }, { status: 400 });
      }

      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
      }

      if (!body.startsAt) {
        return NextResponse.json({ error: "startsAt is required" }, { status: 400 });
      }
      const startsAt = new Date(body.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        return NextResponse.json({ error: "startsAt is invalid" }, { status: 400 });
      }

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const event = await tx.calendarEvent.create({
        data: {
          organizationId: auth.tenantId,
          locationId,
          title,
          description: typeof body.description === "string" ? body.description : null,
          type: typeof body.type === "string" ? body.type : null,
          startsAt,
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
        },
      });

      return NextResponse.json({ event }, { status: 201 });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
