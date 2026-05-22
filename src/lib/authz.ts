import { LocationRole } from "@prisma/client";
import { db } from "@/lib/db";

export interface AccessResolution {
  hasAccess: boolean;
  role: LocationRole | null;
  canApprove: boolean;
}

export async function resolveAccess(
  userId: string,
  locationId: string,
): Promise<AccessResolution> {
  const membership = await db.locationMembership.findUnique({
    where: {
      locationId_userId: {
        locationId,
        userId,
      },
    },
  });

  if (!membership) {
    return { hasAccess: false, role: null, canApprove: false };
  }

  const rule = await db.approvalRule.findUnique({
    where: { locationId },
    select: { reviewerUserIds: true, requiresApproval: true },
  });

  const canApprove =
    membership.role === LocationRole.LOCATION_ADMIN ||
    !!rule?.reviewerUserIds.includes(userId);

  return {
    hasAccess: true,
    role: membership.role,
    canApprove: rule?.requiresApproval ? canApprove : false,
  };
}

