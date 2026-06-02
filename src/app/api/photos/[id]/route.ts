import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const photo = await tx.photoAsset.findFirst({
        where: { id, organizationId: auth.tenantId },
      });

      if (!photo) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }

      if (photo.locationId) {
        const access = await resolveAccess(auth.userId, photo.locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      await tx.photoAsset.delete({ where: { id: photo.id } });

      return NextResponse.json({ success: true });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
