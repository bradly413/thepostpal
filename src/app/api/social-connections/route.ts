import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const body = await request.json();

      const locationId = typeof body.locationId === "string" ? body.locationId : "";
      if (!locationId) return NextResponse.json({ error: "locationId is required" }, { status: 400 });

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const socialConnection = await tx.socialConnection.create({
        data: {
          organizationId: auth.tenantId,
          locationId,
          platform: body.platform,
          handle: typeof body.handle === "string" ? body.handle : null,
          connected: !!body.connected,
        },
      });

      return NextResponse.json({ socialConnection }, { status: 201 });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
