import "server-only";

import type { SessionPayload } from "@/lib/auth";
import type { SessionUser, AuthRole } from "@/lib/auth-store";
import { withProvisioningDb } from "@/lib/db";
import { ensureTenantProvisioned } from "@/lib/tenant-provisioning";

function mapSessionRole(role: string | undefined): AuthRole {
  if (role === "owner" || role === "admin" || role === "member") return role;
  return "owner";
}

/** Build provisioner input from JWT session — fills safe fallbacks when fields are missing. */
export function sessionPayloadToProvisioner(session: SessionPayload): SessionUser | null {
  const accountId = session.tenantId || session.accountId;
  const userId = session.sub;
  if (!accountId || !userId) return null;

  const email =
    typeof session.email === "string" && session.email.trim()
      ? session.email.trim().toLowerCase()
      : `${userId}@workspace.posterboy.local`;

  return {
    userId,
    accountId,
    accountName:
      (typeof session.accountName === "string" && session.accountName.trim()) ||
      "My Workspace",
    email,
    firstName:
      (typeof session.firstName === "string" && session.firstName.trim()) || "Owner",
    lastName: (typeof session.lastName === "string" && session.lastName.trim()) || "",
    role: mapSessionRole(session.role),
  };
}

export async function organizationExists(
  tenantId: string,
  userId: string,
): Promise<boolean> {
  return withProvisioningDb({ tenantId, userId }, async (tx) => {
    const row = await tx.organization.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    return Boolean(row);
  });
}

/**
 * Idempotent: creates Organization + User + Main location when missing.
 * Safe to call on every authenticated request (cheap existence check first).
 */
export async function ensureTenantReadyFromSession(
  session: SessionPayload | null,
): Promise<void> {
  if (!session) return;

  const provisioner = sessionPayloadToProvisioner(session);
  if (!provisioner) return;

  const exists = await organizationExists(provisioner.accountId, provisioner.userId);
  if (exists) {
    const ready = await withProvisioningDb(
      { tenantId: provisioner.accountId, userId: provisioner.userId },
      async (tx) => {
        const membership = await tx.locationMembership.findFirst({
          where: {
            userId: provisioner.userId,
            location: {
              organizationId: provisioner.accountId,
              status: { not: "ARCHIVED" },
            },
          },
          select: { id: true },
        });
        return Boolean(membership);
      },
    );
    if (ready) return;
  }

  await ensureTenantProvisioned(provisioner);
}

/** Resolve a location id the user may use for Meta connect (validates membership). */
export async function resolveMetaConnectLocationId(
  tenantId: string,
  userId: string,
  preferredLocationId?: string | null,
): Promise<string | null> {
  return withProvisioningDb({ tenantId, userId }, async (tx) => {
    const memberships = await tx.locationMembership.findMany({
      where: {
        userId,
        location: { organizationId: tenantId, status: { not: "ARCHIVED" } },
      },
      include: { location: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (memberships.length === 0) return null;

    if (
      preferredLocationId &&
      memberships.some((m) => m.locationId === preferredLocationId)
    ) {
      return preferredLocationId;
    }

    return memberships[0].locationId;
  });
}
