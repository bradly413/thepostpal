import { NextRequest, NextResponse } from "next/server";
import { LocationRole } from "@prisma/client";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { requireLocationAccess } from "@/lib/location-api";

interface Params {
  params: Promise<{ id: string }>;
}

function normalizeRole(input: unknown): LocationRole | null {
  if (typeof input !== "string") return null;
  if (input === "LOCATION_ADMIN" || input === "LOCATION_EDITOR" || input === "LOCATION_VIEWER") {
    return input;
  }
  return null;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      await requireLocationAccess(id, { minimumRole: "LOCATION_EDITOR", dbClient: tx });
      const members = await tx.locationMembership.findMany({
        where: { locationId: id },
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ members });
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN", dbClient: tx });
      const body = await request.json();

      const userId = typeof body.userId === "string" ? body.userId : "";
      const role = normalizeRole(body.role);

      if (!userId || !role) {
        return NextResponse.json({ error: "userId and valid role are required" }, { status: 400 });
      }

      const user = await tx.user.findFirst({ where: { id: userId, organizationId: auth.tenantId } });
      if (!user) {
        return NextResponse.json({ error: "User not found in account" }, { status: 404 });
      }

      const membership = await tx.locationMembership.upsert({
        where: {
          locationId_userId: {
            locationId: id,
            userId,
          },
        },
        create: {
          locationId: id,
          userId,
          role,
        },
        update: {
          role,
        },
      });

      return NextResponse.json({ membership }, { status: 201 });
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
