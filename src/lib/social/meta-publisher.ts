import "server-only";

import { db } from "@/lib/db";
import { publishToFacebook, publishToInstagram } from "@/lib/meta";
import { decryptToken } from "@/lib/social/token-crypto";

export interface MetaPublishIds {
  facebookPostId?: string;
  instagramPostId?: string;
}

/**
 * Publish a public image + caption to the Meta accounts linked to a SocialAccount row.
 *
 * @param accountId — `SocialAccount.id` (cuid). Publishes to that provider; if the row is
 *   Facebook, also attempts Instagram when a sibling IG account exists for the same location.
 */
export async function publishToMeta(
  accountId: string,
  imageUrl: string,
  caption: string,
  options: { organizationId: string },
): Promise<MetaPublishIds> {
  const account = await db.socialAccount.findFirst({
    where: { id: accountId, organizationId: options.organizationId },
  });

  if (!account?.accessToken) {
    throw new Error(`SocialAccount not found: ${accountId}`);
  }

  const siblings = await db.socialAccount.findMany({
    where: {
      organizationId: account.organizationId,
      locationId: account.locationId,
      provider: { in: ["facebook", "instagram"] },
    },
  });

  const facebook = siblings.find((s) => s.provider === "facebook");
  const instagram = siblings.find((s) => s.provider === "instagram");

  const result: MetaPublishIds = {};
  const message = caption.trim();
  const url = imageUrl.trim();

  if (!url) {
    throw new Error("imageUrl is required for Meta publishing");
  }

  if (facebook) {
    const fb = (await publishToFacebook(facebook.accountId, decryptToken(facebook.accessToken), {
      message,
      imageUrl: url,
    })) as { id?: string; post_id?: string };
    result.facebookPostId = fb.id ?? fb.post_id;
  }

  if (instagram) {
    const ig = (await publishToInstagram(instagram.accountId, decryptToken(instagram.accessToken), {
      caption: message,
      imageUrl: url,
    })) as { id?: string };
    result.instagramPostId = ig.id;
  }

  if (!result.facebookPostId && !result.instagramPostId) {
    throw new Error("No Meta targets available for this SocialAccount");
  }

  return result;
}
