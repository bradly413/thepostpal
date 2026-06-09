import "server-only";

import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/social/token-crypto";
import type {
  ExchangedAccount,
  PublishPayload,
  SocialProvider,
} from "@/lib/social/providers/types";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const REGISTER_UPLOAD_URL =
  "https://api.linkedin.com/rest/images?action=initializeUpload";

// LinkedIn versioned APIs require the LinkedIn-Version header (YYYYMM).
const LINKEDIN_VERSION = "202401";

const SCOPES = ["openid", "profile", "email", "w_member_social"].join(" ");

function clientId(): string {
  const id = process.env.LINKEDIN_CLIENT_ID?.trim();
  if (!id) throw new Error("LINKEDIN_CLIENT_ID not configured");
  return id;
}

function clientSecret(): string {
  const secret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("LINKEDIN_CLIENT_SECRET not configured");
  return secret;
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  email?: string;
}

function expiresAtFrom(expiresIn?: number): Date | null {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
}

export const linkedinProvider: SocialProvider = {
  id: "linkedin",

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: redirectUri,
      state,
      scope: SCOPES,
    });
    return `${AUTH_URL}?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<ExchangedAccount[]> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId(),
        client_secret: clientSecret(),
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`LinkedIn token exchange failed: HTTP ${tokenRes.status}`);
    }

    const token = (await tokenRes.json()) as LinkedInTokenResponse;

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error(`LinkedIn userinfo failed: HTTP ${userRes.status}`);
    }
    const user = (await userRes.json()) as LinkedInUserInfo;

    return [
      {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: expiresAtFrom(token.expires_in),
        accountId: user.sub,
        accountName: user.name || user.email || "LinkedIn Member",
      },
    ];
  },

  async refreshToken(
    account: SocialAccount,
  ): Promise<{
    newAccessToken: string;
    newRefreshToken?: string;
    newExpiresAt?: Date | null;
  }> {
    // LinkedIn's refresh grant requires the stored refresh_token. If we never
    // captured one (legacy connection, or a member who didn't grant it), there
    // is nothing to refresh — surface as a failure so the cron flags the account
    // for reconnect.
    if (!account.refreshToken) {
      throw new Error(
        "LinkedIn token refresh requires a stored refresh_token; reconnect required",
      );
    }

    const refreshToken = decryptToken(account.refreshToken);
    if (!refreshToken.trim()) {
      throw new Error(
        "LinkedIn token refresh requires a stored refresh_token; reconnect required",
      );
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId(),
        client_secret: clientSecret(),
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`LinkedIn token refresh failed: HTTP ${tokenRes.status}`);
    }

    const token = (await tokenRes.json()) as LinkedInTokenResponse;
    if (!token.access_token) {
      throw new Error("LinkedIn token refresh returned no access_token");
    }

    return {
      newAccessToken: token.access_token,
      // LinkedIn may rotate the refresh token; persist the new one when returned.
      newRefreshToken: token.refresh_token,
      newExpiresAt: expiresAtFrom(token.expires_in),
    };
  },

  async publish(
    account: SocialAccount,
    payload: PublishPayload,
  ): Promise<{ postId: string }> {
    const accessToken = decryptToken(account.accessToken);
    const authorUrn = `urn:li:person:${account.accountId}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    };

    let contentBlock: Record<string, unknown> | undefined;

    // Single image upload (register-upload -> upload bytes -> reference image urn).
    const imageUrl =
      payload.mediaType === "IMAGE" ? payload.mediaUrls?.[0]?.trim() : undefined;

    if (imageUrl) {
      const initRes = await fetch(REGISTER_UPLOAD_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          initializeUploadRequest: { owner: authorUrn },
        }),
      });
      if (!initRes.ok) {
        throw new Error(`LinkedIn image init failed: HTTP ${initRes.status}`);
      }
      const initJson = (await initRes.json()) as {
        value?: { uploadUrl?: string; image?: string };
      };
      const uploadUrl = initJson.value?.uploadUrl;
      const imageUrn = initJson.value?.image;
      if (!uploadUrl || !imageUrn) {
        throw new Error("LinkedIn image init missing uploadUrl/image urn");
      }

      const srcRes = await fetch(imageUrl);
      if (!srcRes.ok) {
        throw new Error(`Failed to fetch source image: HTTP ${srcRes.status}`);
      }
      const bytes = Buffer.from(await srcRes.arrayBuffer());

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: bytes,
      });
      if (!uploadRes.ok) {
        throw new Error(`LinkedIn image upload failed: HTTP ${uploadRes.status}`);
      }

      contentBlock = { media: { id: imageUrn } };
    }

    const postBody: Record<string, unknown> = {
      author: authorUrn,
      commentary: payload.caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    if (contentBlock) {
      postBody.content = contentBlock;
    }

    const postRes = await fetch(POSTS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(postBody),
    });
    if (!postRes.ok) {
      throw new Error(`LinkedIn post create failed: HTTP ${postRes.status}`);
    }

    // The created post URN is returned in the x-restli-id (or x-linkedin-id) header.
    const postId =
      postRes.headers.get("x-restli-id") ||
      postRes.headers.get("x-linkedin-id") ||
      "";

    return { postId };
  },
};
