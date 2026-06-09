import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { handleRouteError } from "@/lib/route-errors";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const event = await tx.calendarEvent.findFirst({
        where: { id, organizationId: auth.tenantId },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (event.locationId) {
        const access = await resolveAccess(auth.userId, event.locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const body = await request.json();
      const startsAt = body.startsAt ? new Date(body.startsAt) : undefined;
      if (startsAt && Number.isNaN(startsAt.getTime())) {
        return NextResponse.json({ error: "startsAt is invalid" }, { status: 400 });
      }

      const updated = await tx.calendarEvent.update({
        where: { id: event.id },
        data: {
          title: typeof body.title === "string" ? body.title : undefined,
          description:
            body.description === null
              ? null
              : typeof body.description === "string"
                ? body.description
                : undefined,
          type:
            body.type === null
              ? null
              : typeof body.type === "string"
                ? body.type
                : undefined,
          startsAt,
          endsAt:
            body.endsAt === null ? null : body.endsAt ? new Date(body.endsAt) : undefined,
        },
      });

      return NextResponse.json({ event: updated });
    });
  } catch (error) {
    return handleRouteError("api.calendar.id.DELETE", error);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const event = await tx.calendarEvent.findFirst({
        where: { id, organizationId: auth.tenantId },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (event.locationId) {
        const access = await resolveAccess(auth.userId, event.locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      await tx.calendarEvent.delete({ where: { id: event.id } });

      return NextResponse.json({ success: true });
    });
  } catch (error) {
    return handleRouteError("api.calendar.id.PUT", error);
  }
}
