import "server-only";

import type { SocialAccount, SocialPlatform } from "@prisma/client";
import { db } from "@/lib/db";
import {
  exchangeCode as metaExchangeCode,
  getAuthLoginUrl,
  getInstagramAccount,
  getLongLivedToken,
  getPages,
} from "@/lib/meta";
import { publishToMeta } from "@/lib/meta-api";
import { decryptToken } from "@/lib/social/token-crypto";
import type {
  ExchangedAccount,
  PublishPayload,
  SocialProvider,
} from "@/lib/social/providers/types";

/**
 * Meta provider — a thin FACADE over the existing, working Meta code.
 *
 * It does NOT reimplement Graph calls. OAuth delegates to `src/lib/meta.ts`,
 * and publishing delegates to the SAME live function the cron uses
 * (`publishToMeta` in `src/lib/meta-api.ts`).
 */
export const metaProvider: SocialProvider = {
  id: "meta",

  getAuthUrl(state: string): string {
    // Meta's redirect URI is fixed by app config (META_AUTH_REDIRECT_URI),
    // so the redirectUri arg is intentionally unused here.
    return getAuthLoginUrl(state);
  },

  async exchangeCode(code: string, redirectUri: string): Promise<ExchangedAccount[]> {
    const { access_token: shortToken } = await metaExchangeCode(code, redirectUri);
    const long = await getLongLivedToken(shortToken);
    const pages = await getPages(long.access_token);

    const tokenExpiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000)
      : null;

    const accounts: ExchangedAccount[] = [];

    for (const page of pages) {
      // One ExchangedAccount per connectable surface, mirroring what the
      // existing callback persists (a "facebook" row + optional "instagram" row,
      // both using the Page access token).
      accounts.push({
        accessToken: page.access_token,
        expiresAt: tokenExpiresAt,
        accountId: page.id,
        accountName: page.name,
        providerSubtype: "facebook",
      });

      const igId = await getInstagramAccount(page.id, page.access_token);
      if (igId) {
        accounts.push({
          accessToken: page.access_token,
          expiresAt: tokenExpiresAt,
          accountId: igId,
          accountName: "Instagram Business",
          providerSubtype: "instagram",
        });
      }
    }

    return accounts;
  },

  /**
   * NO-OP for Meta. Page access tokens minted from a long-lived user token do
   * not expire, so the refresh cron must never fruitlessly try to refresh them.
   * Returns the same (decrypted) token with no expiry.
   */
  async refreshToken(
    encryptedToken: string,
  ): Promise<{ newAccessToken: string; newExpiresAt?: Date | null }> {
    return {
      newAccessToken: decryptToken(encryptedToken),
      newExpiresAt: null,
    };
  },

  async publish(
    account: SocialAccount,
    payload: PublishPayload,
  ): Promise<{ postId: string }> {
    // Resolve the Graph target ids the live publisher expects. The cron/service
    // path keys off a Page id (+ optional linked IG business account id). We
    // look up sibling rows for the same location so a single publish lands on
    // the correct surface(s), exactly like the existing flow.
    const siblings = await db.socialAccount.findMany({
      where: {
        organizationId: account.organizationId,
        locationId: account.locationId,
        provider: { in: ["facebook", "instagram"] },
      },
    });

    const facebook = siblings.find((s) => s.provider === "facebook");
    const instagram = siblings.find((s) => s.provider === "instagram");

    // Determine which surface this account row targets and build the platform
    // list + Graph ids accordingly.
    const platforms: SocialPlatform[] = [];
    let pageId: string | null = facebook?.accountId ?? null;
    let igAccountId: string | null = instagram?.accountId ?? null;

    if (account.provider === "instagram") {
      platforms.push("instagram");
      igAccountId = account.accountId;
      // publishToMeta requires a pageId for its target; reuse the sibling FB
      // page id when present (the IG row carries the same Page token).
      pageId = facebook?.accountId ?? null;
    } else {
      platforms.push("facebook");
      pageId = account.accountId;
    }

    if (!pageId) {
      throw new Error("Meta publish: missing Facebook Page id for target");
    }

    const mediaUrl = payload.mediaUrls?.[0]?.trim() || null;
    const mediaType =
      payload.mediaType === "VIDEO"
        ? "video"
        : payload.mediaType === "IMAGE"
          ? "image"
          : null;

    const result = await publishToMeta(
      {
        copy: payload.caption,
        platforms,
        mediaUrl,
        mediaType,
      },
      // Page access token (decrypted) — same token used for FB + linked IG.
      decryptToken(account.accessToken),
      { pageId, igAccountId },
    );

    const fb = result.facebook as { id?: string; post_id?: string } | undefined;
    const ig = result.instagram as { id?: string } | undefined;
    const postId = ig?.id ?? fb?.id ?? fb?.post_id ?? "";

    return { postId };
  },
};
