import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireLocationAccess } from "@/lib/location-api";
import { syncLocationBilling } from "@/lib/location-billing";
import { handleRouteError } from "@/lib/route-errors";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { auth } = await requireLocationAccess(id);
    return await withTenantDb(auth, async (tx) => {
      const location = await tx.location.findFirst({
        where: { id, organizationId: auth.tenantId },
        include: { approvalRule: true },
      });
      if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ location });
    });
  } catch (err) {
    return handleRouteError("api.locations.GET", err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { auth } = await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN" });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      const updated = await tx.location.update({
        where: { id },
        data: {
          name: typeof body.name === "string" ? body.name : undefined,
          brandPrimaryColor: typeof body.brandPrimaryColor === "string" ? body.brandPrimaryColor : undefined,
          brandAccentColor: typeof body.brandAccentColor === "string" ? body.brandAccentColor : undefined,
          brandFontStack: typeof body.brandFontStack === "string" ? body.brandFontStack : undefined,
          brandVoiceJson: body.brandVoiceJson ?? undefined,
          city: typeof body.city === "string" ? body.city : undefined,
          state: typeof body.state === "string" ? body.state : undefined,
          country: typeof body.country === "string" ? body.country : undefined,
          timeZone: typeof body.timeZone === "string" ? body.timeZone : undefined,
        },
      });

      return NextResponse.json({ location: updated });
    });
  } catch (err) {
    return handleRouteError("api.locations.PUT", err);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { auth } = await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN" });
    return await withTenantDb(auth, async (tx) => {
      const archived = await tx.location.update({
        where: { id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });

      const billingSync = await syncLocationBilling(auth.tenantId, tx);

      return NextResponse.json({ location: archived, billingSync });
    });
  } catch (err) {
    return handleRouteError("api.locations.DELETE", err);
  }
}
