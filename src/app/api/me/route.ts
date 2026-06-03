import { NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";

// ─────────────────────────────────────────────────────────────
//  GET /api/me
//
//  Single source of truth for client-side plan-tier gating.
//  Returns the live Organization.plan (never the stale 30-day JWT)
//  plus role/locationCount so the dashboard can adapt its surface.
//
//  Response:
//    { plan, role, organizationId, isSuperadmin, locationCount }
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: {
          plan: true,
          name: true,
          businessType: true,
          website: true,
          locationCount: true,
          createdAt: true,
        },
      });

      if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      const locationCount = await tx.location.count({
        where: { organizationId: auth.tenantId, status: { not: "ARCHIVED" } },
      });

      return NextResponse.json({
        plan: org.plan,
        role: auth.role,
        organizationId: auth.organizationId,
        isSuperadmin: auth.isSuperadmin,
        locationCount,
        organization: {
          id: auth.organizationId,
          name: org.name,
          businessType: org.businessType,
          website: org.website,
          locationCount: org.locationCount,
          plan: org.plan,
          createdAt: org.createdAt.toISOString(),
        },
      });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
