import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import {
  assertCanConnectSocialProfile,
  SOLO_MAX_CONNECTED_PROFILES,
} from "@/lib/social-profile-limits";

const SOCIAL_CONNECTION_PUBLIC_SELECT = {
  id: true,
  organizationId: true,
  locationId: true,
  platform: true,
  handle: true,
  externalAccountId: true,
  connected: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const locationId = request.nextUrl.searchParams.get("locationId");

      if (locationId) {
        const access = await resolveAccess(auth.userId, locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const connections = await tx.socialConnection.findMany({
          where: { organizationId: auth.tenantId, locationId },
          select: SOCIAL_CONNECTION_PUBLIC_SELECT,
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ connections });
      }

      const connections = await tx.socialConnection.findMany({
        where: { organizationId: auth.tenantId },
        select: SOCIAL_CONNECTION_PUBLIC_SELECT,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ connections });
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

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const organization = await tx.organization.findFirst({
        where: { id: auth.tenantId },
        select: { plan: true },
      });
      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      if (body.connected) {
        try {
          await assertCanConnectSocialProfile(tx, auth.tenantId, organization.plan);
        } catch (error) {
          if (error instanceof Error && error.message === "SOLO_PROFILE_LIMIT") {
            return NextResponse.json(
              {
                error: `Solo includes up to ${SOLO_MAX_CONNECTED_PROFILES} connected social profiles.`,
              },
              { status: 402 },
            );
          }
          throw error;
        }
      }

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
