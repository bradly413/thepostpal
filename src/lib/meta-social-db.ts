import "server-only";

import type { TenantDbClient } from "@/lib/db";
import type { AuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import {
  assertCanConnectSocialProfile,
} from "@/lib/social-profile-limits";
import { decryptToken, encryptToken, isEncryptedToken } from "@/lib/social/token-crypto";
import type {
  MetaConnectionPublic,
  MetaConnectionSecrets,
} from "@/lib/meta-connection-types";

const META_PLATFORMS = ["facebook", "instagram"] as const;

export interface PersistMetaBundleInput {
  locationId: string;
  pageId: string;
  pageName: string;
  pageToken: string;
  igAccountId: string | null;
}

export async function persistMetaBundle(
  auth: AuthContext,
  tx: TenantDbClient,
  input: PersistMetaBundleInput,
): Promise<MetaConnectionPublic> {
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

  await tx.socialConnection.deleteMany({
    where: {
      organizationId: auth.tenantId,
      locationId: input.locationId,
      platform: { in: [...META_PLATFORMS] },
    },
  });

  try {
    await assertCanConnectSocialProfile(tx, auth.tenantId, organization.plan);
  } catch (error) {
    if (error instanceof Error && error.message === "SOLO_PROFILE_LIMIT") {
      throw error;
    }
    throw error;
  }

  const connectedAt = new Date();
  const encryptedToken = encryptToken(input.pageToken);

  await tx.socialConnection.create({
    data: {
      organizationId: auth.tenantId,
      locationId: input.locationId,
      platform: "facebook",
      handle: input.pageName,
      externalAccountId: input.pageId,
      connected: true,
      accessToken: encryptedToken,
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
    await tx.socialConnection.create({
      data: {
        organizationId: auth.tenantId,
        locationId: input.locationId,
        platform: "instagram",
        handle: "Instagram Business",
        externalAccountId: input.igAccountId,
        connected: true,
        accessToken: encryptedToken,
      },
    });
  }

  return {
    connected: true,
    pageName: input.pageName,
    pageId: input.pageId,
    igAccountId: input.igAccountId,
    locationId: input.locationId,
    connectedAt: connectedAt.toISOString(),
  };
}

export async function loadMetaBundlePublic(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
): Promise<MetaConnectionPublic | null> {
  const access = await resolveAccess(auth.userId, locationId, tx);
  if (!access.hasAccess) {
    throw new Error("FORBIDDEN");
  }

  const rows = await tx.socialConnection.findMany({
    where: {
      organizationId: auth.tenantId,
      locationId,
      platform: { in: [...META_PLATFORMS] },
      connected: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const facebook = rows.find((row) => row.platform === "facebook");
  if (!facebook?.externalAccountId || !facebook.accessToken) {
    return null;
  }

  const instagram = rows.find((row) => row.platform === "instagram");

  return {
    connected: true,
    pageName: facebook.handle || "Facebook Page",
    pageId: facebook.externalAccountId,
    igAccountId: instagram?.externalAccountId ?? null,
    locationId,
    connectedAt: facebook.updatedAt.toISOString(),
  };
}

export async function loadMetaBundleSecrets(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
): Promise<MetaConnectionSecrets | null> {
  const access = await resolveAccess(auth.userId, locationId, tx);
  if (!access.hasAccess) {
    throw new Error("FORBIDDEN");
  }

  const rows = await tx.socialConnection.findMany({
    where: {
      organizationId: auth.tenantId,
      locationId,
      platform: { in: [...META_PLATFORMS] },
      connected: true,
    },
  });

  const facebook = rows.find((row) => row.platform === "facebook");
  if (!facebook?.externalAccountId || !facebook.accessToken) {
    return null;
  }

  const instagram = rows.find((row) => row.platform === "instagram");

  return {
    pageId: facebook.externalAccountId,
    pageToken: decryptToken(facebook.accessToken),
    pageName: facebook.handle || "Facebook Page",
    igAccountId: instagram?.externalAccountId ?? null,
  };
}

/** Cron / system context — no user auth; scoped by organization + location. */
export async function loadMetaBundleSecretsForCron(
  tx: TenantDbClient,
  organizationId: string,
  locationId: string,
): Promise<MetaConnectionSecrets | null> {
  const rows = await tx.socialConnection.findMany({
    where: {
      organizationId,
      locationId,
      platform: { in: [...META_PLATFORMS] },
      connected: true,
    },
  });

  const facebook = rows.find((row) => row.platform === "facebook");
  if (!facebook?.externalAccountId || !facebook.accessToken) {
    return null;
  }

  const instagram = rows.find((row) => row.platform === "instagram");

  return {
    pageId: facebook.externalAccountId,
    pageToken: decryptToken(facebook.accessToken),
    pageName: facebook.handle || "Facebook Page",
    igAccountId: instagram?.externalAccountId ?? null,
  };
}

export async function disconnectMetaBundle(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
): Promise<void> {
  const access = await resolveAccess(auth.userId, locationId, tx);
  if (!access.hasAccess) {
    throw new Error("FORBIDDEN");
  }

  await tx.socialConnection.deleteMany({
    where: {
      organizationId: auth.tenantId,
      locationId,
      platform: { in: [...META_PLATFORMS] },
    },
  });
}

export async function migrateEncryptedSocialConnectionTokens(tx: TenantDbClient): Promise<{
  total: number;
  migratedAccessTokens: number;
  migratedRefreshTokens: number;
  skipped: number;
}> {
  const rows = await tx.socialConnection.findMany({
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
    },
  });

  let migratedAccessTokens = 0;
  let migratedRefreshTokens = 0;
  let skipped = 0;

  for (const row of rows) {
    const nextAccessToken =
      row.accessToken && !isEncryptedToken(row.accessToken)
        ? encryptToken(row.accessToken)
        : row.accessToken;
    const nextRefreshToken =
      row.refreshToken && !isEncryptedToken(row.refreshToken)
        ? encryptToken(row.refreshToken)
        : row.refreshToken;

    if (nextAccessToken === row.accessToken && nextRefreshToken === row.refreshToken) {
      skipped += 1;
      continue;
    }

    await tx.socialConnection.update({
      where: { id: row.id },
      data: {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      },
    });

    if (nextAccessToken !== row.accessToken) {
      migratedAccessTokens += 1;
    }
    if (nextRefreshToken !== row.refreshToken) {
      migratedRefreshTokens += 1;
    }
  }

  return {
    total: rows.length,
    migratedAccessTokens,
    migratedRefreshTokens,
    skipped,
  };
}
