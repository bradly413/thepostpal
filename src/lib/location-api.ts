import { NextResponse } from "next/server";
import { LocationRole } from "@prisma/client";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireLocationAccess(
  locationId: string,
  options?: { requireApprove?: boolean; minimumRole?: LocationRole },
) {
  const auth = await requireAuthContext();
  const access = await resolveAccess(auth.userId, locationId);
  if (!access.hasAccess) {
    throw new Error("FORBIDDEN");
  }

  if (options?.requireApprove && !access.canApprove) {
    throw new Error("APPROVER_REQUIRED");
  }

  if (options?.minimumRole) {
    const rank: Record<LocationRole, number> = {
      LOCATION_VIEWER: 0,
      LOCATION_EDITOR: 1,
      LOCATION_ADMIN: 2,
    };
    if (rank[access.role ?? "LOCATION_VIEWER"] < rank[options.minimumRole]) {
      throw new Error("INSUFFICIENT_ROLE");
    }
  }

  return { auth, access };
}

