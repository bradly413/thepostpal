import type { PlanTier } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { SINGLE_LOCATION_PLANS } from "@/lib/plan-features";

export const SOLO_MAX_CONNECTED_PROFILES = 3;

type DbClient = Prisma.TransactionClient;

export function isSoloPlan(plan: PlanTier): boolean {
  return SINGLE_LOCATION_PLANS.has(plan);
}

export async function countConnectedSocialProfiles(
  tx: DbClient,
  organizationId: string,
): Promise<number> {
  return tx.socialConnection.count({
    where: { organizationId, connected: true },
  });
}

export async function assertCanConnectSocialProfile(
  tx: DbClient,
  organizationId: string,
  plan: PlanTier,
): Promise<void> {
  if (!isSoloPlan(plan)) return;

  const connected = await countConnectedSocialProfiles(tx, organizationId);
  if (connected >= SOLO_MAX_CONNECTED_PROFILES) {
    throw new Error("SOLO_PROFILE_LIMIT");
  }
}
