import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { getInstagramAccount } from "@/lib/meta";
import { persistMetaBundle } from "@/lib/meta-social-db";
import type { MetaConnectionPublic } from "@/lib/meta-connection-types";
import { persistMetaSocialAccounts } from "@/lib/social/social-account-db";

export interface MetaPageChoice {
  id: string;
  name: string;
  access_token: string;
}

export async function completeMetaPageConnection(
  auth: AuthContext,
  locationId: string,
  page: MetaPageChoice,
  tokenExpiresAt: Date | null,
): Promise<MetaConnectionPublic> {
  const igId = (await getInstagramAccount(page.id, page.access_token)) || null;

  return withTenantDb(auth, async (tx) => {
    await persistMetaSocialAccounts(auth, tx, {
      locationId,
      pageId: page.id,
      pageName: page.name,
      pageToken: page.access_token,
      igAccountId: igId,
      tokenExpiresAt,
    });
    return persistMetaBundle(auth, tx, {
      locationId,
      pageId: page.id,
      pageName: page.name,
      pageToken: page.access_token,
      igAccountId: igId,
    });
  });
}
