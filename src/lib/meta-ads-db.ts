import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import type { TenantDbClient } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { isMetaAdsFeatureActive } from "@/lib/plan-features";
import { listAdAccounts } from "@/lib/meta-ads";
import { decryptToken, encryptToken } from "@/lib/social/token-crypto";

export class MetaAdsAccessError extends Error {
  constructor(
    message: string,
    public code: "FORBIDDEN" | "FEATURE_OFF" | "NOT_CONNECTED",
  ) {
    super(message);
    this.name = "MetaAdsAccessError";
  }
}

export async function assertMetaAdsEnabled(
  auth: AuthContext,
  tx: TenantDbClient,
): Promise<void> {
  const org = await tx.organization.findFirst({
    where: { id: auth.tenantId },
    select: { plan: true },
  });
  if (!org || !isMetaAdsFeatureActive(org.plan)) {
    throw new MetaAdsAccessError("Meta Ads is not enabled for this workspace", "FEATURE_OFF");
  }
}

export async function assertMetaAdsLocationAccess(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
): Promise<void> {
  await assertMetaAdsEnabled(auth, tx);
  const access = await resolveAccess(auth.userId, locationId, tx);
  if (!access.hasAccess) {
    throw new MetaAdsAccessError("Forbidden", "FORBIDDEN");
  }
}

export async function loadMetaAdsUserToken(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
): Promise<string> {
  const row = await tx.socialConnection.findFirst({
    where: {
      organizationId: auth.tenantId,
      locationId,
      platform: "meta_ads",
      connected: true,
    },
    select: { accessToken: true },
  });
  if (!row?.accessToken) {
    throw new MetaAdsAccessError("Connect Meta Ads for this location first", "NOT_CONNECTED");
  }
  return decryptToken(row.accessToken);
}

export async function loadFacebookPageForAds(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
): Promise<{ pageId: string; pageToken: string; pageName: string }> {
  const row = await tx.socialConnection.findFirst({
    where: {
      organizationId: auth.tenantId,
      locationId,
      platform: "facebook",
      connected: true,
    },
    select: {
      externalAccountId: true,
      accessToken: true,
      handle: true,
    },
  });
  if (!row?.externalAccountId || !row.accessToken) {
    throw new MetaAdsAccessError("Connect Facebook for this location before running ads", "NOT_CONNECTED");
  }
  return {
    pageId: row.externalAccountId,
    pageToken: decryptToken(row.accessToken),
    pageName: row.handle || "Page",
  };
}

export async function persistMetaAdsUserToken(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
  userToken: string,
): Promise<void> {
  await assertMetaAdsLocationAccess(auth, tx, locationId);

  await tx.socialConnection.upsert({
    where: {
      locationId_platform: { locationId, platform: "meta_ads" },
    },
    create: {
      organizationId: auth.tenantId,
      locationId,
      platform: "meta_ads",
      handle: "Meta Ads",
      connected: true,
      accessToken: encryptToken(userToken),
    },
    update: {
      connected: true,
      accessToken: encryptToken(userToken),
    },
  });
}

export async function syncMetaAdAccounts(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId: string,
  userToken: string,
) {
  const remote = await listAdAccounts(userToken);
  const saved = [];

  for (const account of remote) {
    const adAccountId = account.account_id || account.id;
    const row = await tx.metaAdAccount.upsert({
      where: {
        organizationId_adAccountId: {
          organizationId: auth.tenantId,
          adAccountId,
        },
      },
      create: {
        organizationId: auth.tenantId,
        locationId,
        adAccountId,
        name: account.name,
        currency: account.currency || "USD",
      },
      update: {
        locationId,
        name: account.name,
        currency: account.currency || "USD",
      },
    });
    saved.push(row);
  }

  return saved;
}

export async function listStoredMetaAdAccounts(
  auth: AuthContext,
  tx: TenantDbClient,
  locationId?: string | null,
) {
  return tx.metaAdAccount.findMany({
    where: {
      organizationId: auth.tenantId,
      ...(locationId ? { locationId } : {}),
    },
    orderBy: { name: "asc" },
  });
}
