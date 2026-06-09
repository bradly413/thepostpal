import "server-only";

import type { TenantDbClient } from "@/lib/db";
import type { AuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import {
  assertCanConnectSocialProfile,
} from "@/lib/social-profile-limits";
import { encryptToken, isEncryptedToken } from "@/lib/social/token-crypto";

export interface PersistMetaSocialAccountsInput {
  locationId: string;
  pageId: string;
  pageName: string;
  pageToken: string;
  igAccountId: string | null;
  tokenExpiresAt?: Date | null;
}

export async function persistMetaSocialAccounts(
  auth: AuthContext,
  tx: TenantDbClient,
  input: PersistMetaSocialAccountsInput,
): Promise<void> {
  const access = await resolveAccess(auth.userId, input.locationId, tx);
  if (!access.hasAccess) {
    throw new Error("FORBIDDEN");
  }

  const organization = await tx.organization.findFirst({
    where: { id: auth.tenantId },
    select: { plan: true },
  });
  if (!organization) {
    throw new Error("ORG_NOT_FOUND");
  }

  await tx.socialAccount.deleteMany({
    where: {
      organizationId: auth.tenantId,
      locationId: input.locationId,
      provider: { in: ["facebook", "instagram"] },
    },
  });

  await assertCanConnectSocialProfile(tx, auth.tenantId, organization.plan);

  const encryptedToken = encryptToken(input.pageToken);

  await tx.socialAccount.create({
    data: {
      organizationId: auth.tenantId,
      locationId: input.locationId,
      provider: "facebook",
      accountId: input.pageId,
      accountName: input.pageName,
      accessToken: encryptedToken,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
    },
  });

  if (input.igAccountId) {
    try {
      await assertCanConnectSocialProfile(tx, auth.tenantId, organization.plan);
    } catch (error) {
      if (error instanceof Error && error.message === "SOLO_PROFILE_LIMIT") {
        throw error;
      }
      throw error;
    }

    await tx.socialAccount.create({
      data: {
        organizationId: auth.tenantId,
        locationId: input.locationId,
        provider: "instagram",
        accountId: input.igAccountId,
        accountName: "Instagram Business",
        accessToken: encryptedToken,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
      },
    });
  }
}

export async function loadSocialAccountById(
  tx: TenantDbClient,
  organizationId: string,
  socialAccountId: string,
) {
  return tx.socialAccount.findFirst({
    where: { id: socialAccountId, organizationId },
  });
}

export async function loadMetaSocialAccountsForLocation(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
) {
  const access = await resolveAccess(auth.userId, locationId, tx);
  if (!access.hasAccess) {
    throw new Error("FORBIDDEN");
  }

  return tx.socialAccount.findMany({
    where: {
      organizationId: auth.tenantId,
      locationId,
      provider: { in: ["facebook", "instagram"] },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function migrateEncryptedSocialAccountTokens(tx: TenantDbClient): Promise<{
  total: number;
  migrated: number;
  skipped: number;
}> {
  const rows = await tx.socialAccount.findMany({
    select: {
      id: true,
      accessToken: true,
    },
  });

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (isEncryptedToken(row.accessToken)) {
      skipped += 1;
      continue;
    }

    await tx.socialAccount.update({
      where: { id: row.id },
      data: {
        accessToken: encryptToken(row.accessToken),
      },
    });
    migrated += 1;
  }

  return {
    total: rows.length,
    migrated,
    skipped,
  };
}
