import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import type { TenantDbClient } from "@/lib/db";
import { deleteAuthStoreForAccount } from "@/lib/auth-store";

/**
 * Deletes the tenant organization and all cascaded data (locations, posts,
 * social connections, brand assets, etc.). Caller must clear the session after.
 */
export async function deleteTenantOrganization(
  auth: AuthContext,
  tx: TenantDbClient,
): Promise<void> {
  const membership = await tx.user.findFirst({
    where: { id: auth.userId, organizationId: auth.tenantId },
    select: { role: true },
  });

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("FORBIDDEN_ROLE");
  }

  await tx.organization.delete({
    where: { id: auth.tenantId },
  });

  await deleteAuthStoreForAccount(auth.tenantId, auth.userId);
}
