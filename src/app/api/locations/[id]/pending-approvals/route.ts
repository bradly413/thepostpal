import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { requireLocationAccess } from "@/lib/location-api";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      await requireLocationAccess(id, { minimumRole: "LOCATION_EDITOR", dbClient: tx });

      const pending = await tx.postApproval.findMany({
        where: { locationId: id, status: "PENDING_REVIEW" },
        include: {
          scheduledPost: true,
          history: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ pending });
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
