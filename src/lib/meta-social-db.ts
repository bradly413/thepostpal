import "server-only";

import type { TenantDbClient } from "@/lib/db";
import type { AuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import {
  assertCanConnectSocialProfile,
} from "@/lib/social-profile-limits";
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

  await tx.socialConnection.create({
    data: {
      organizationId: auth.tenantId,
      locationId: input.locationId,
      platform: "facebook",
      handle: input.pageName,
      externalAccountId: input.pageId,
      connected: true,
      accessToken: input.pageToken,
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
        accessToken: input.pageToken,
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
    pageToken: facebook.accessToken,
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
