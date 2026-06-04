import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";

// GET/PUT the tenant's account settings (profile / posting / notifications),
// persisted on Organization.accountSettings (replaces the old localStorage).

export async function GET() {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { accountSettings: true },
      });
      return NextResponse.json({ settings: org?.accountSettings ?? null });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuthContext();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "settings object required" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.update({
        where: { id: auth.tenantId },
        data: { accountSettings: body as Prisma.InputJsonValue },
        select: { accountSettings: true },
      });
      return NextResponse.json({ settings: org.accountSettings });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
