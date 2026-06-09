import "server-only";

import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/social/token-crypto";
import type {
  ExchangedAccount,
  PublishPayload,
  SocialProvider,
} from "@/lib/social/providers/types";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name";

// TikTok requires the publishing/upload scopes to be approved via app audit.
// video.publish remains gated until that audit clears (see publish() below).
const SCOPES = "user.info.basic,video.publish,video.upload";

function clientKey(): string {
  const key = process.env.TIKTOK_CLIENT_KEY?.trim();
  if (!key) throw new Error("TIKTOK_CLIENT_KEY not configured");
  return key;
}

function clientSecret(): string {
  const secret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("TIKTOK_CLIENT_SECRET not configured");
  return secret;
}

interface TikTokTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface TikTokUserInfoResponse {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
}

function expiresAtFrom(expiresIn?: number): Date | null {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
}

async function fetchProfile(
  accessToken: string,
): Promise<{ openId: string; displayName: string }> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`TikTok user info failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as TikTokUserInfoResponse;
  if (json.error?.code && json.error.code !== "ok") {
    throw new Error(
      `TikTok user info error: ${json.error.message || json.error.code}`,
    );
  }
  const user = json.data?.user;
  if (!user?.open_id) {
    throw new Error("TikTok user info returned no open_id");
  }
  return {
    openId: user.open_id,
    displayName: user.display_name || "TikTok Account",
  };
}

export const tiktokProvider: SocialProvider & {
  getProfile(
    account: SocialAccount,
  ): Promise<{ openId: string; displayName: string }>;
} = {
  id: "tiktok",

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_key: clientKey(),
      response_type: "code",
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
    });
    return `${AUTH_URL}?${params}`;
  },

  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<ExchangedAccount[]> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey(),
        client_secret: clientSecret(),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`TikTok token exchange failed: HTTP ${tokenRes.status}`);
    }

    const token = (await tokenRes.json()) as TikTokTokenResponse;
    if (token.error) {
      throw new Error(
        `TikTok token exchange error: ${token.error_description || token.error}`,
      );
    }
    if (!token.access_token) {
      throw new Error("TikTok token exchange returned no access_token");
    }

    // Prefer the open_id from the token response; fall back to a user-info call.
    let openId = token.open_id;
    let displayName = "TikTok Account";
    try {
      const profile = await fetchProfile(token.access_token);
      openId = openId || profile.openId;
      displayName = profile.displayName;
    } catch {
      // user.info.basic may be unavailable pre-audit; the token open_id is
      // sufficient to persist the connection.
    }

    if (!openId) {
      throw new Error("TikTok token exchange returned no open_id");
    }

    return [
      {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: expiresAtFrom(token.expires_in),
        accountId: openId,
        accountName: displayName,
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
    // TikTok's refresh grant requires the stored refresh_token. Without one
    // (legacy/partial connection) there is nothing to refresh — surface as a
    // failure so the cron flags the account for reconnect.
    if (!account.refreshToken) {
      throw new Error(
        "TikTok token refresh requires a stored refresh_token; reconnect required",
      );
    }

    const refreshToken = decryptToken(account.refreshToken);
    if (!refreshToken.trim()) {
      throw new Error(
        "TikTok token refresh requires a stored refresh_token; reconnect required",
      );
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey(),
        client_secret: clientSecret(),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`TikTok token refresh failed: HTTP ${tokenRes.status}`);
    }

    const token = (await tokenRes.json()) as TikTokTokenResponse;
    if (token.error) {
      throw new Error(
        `TikTok token refresh error: ${token.error_description || token.error}`,
      );
    }
    if (!token.access_token) {
      throw new Error("TikTok token refresh returned no access_token");
    }

    return {
      newAccessToken: token.access_token,
      // TikTok rotates the refresh token; persist the new one when returned.
      newRefreshToken: token.refresh_token,
      newExpiresAt: expiresAtFrom(token.expires_in),
    };
  },

  async publish(
    _account: SocialAccount,
    _payload: PublishPayload,
  ): Promise<{ postId: string }> {
    // SCAFFOLD ONLY — inert. TikTok video publishing requires the video.publish
    // scope, which is gated behind a TikTok app audit. Until that audit clears,
    // this path must never attempt a live publish.
    throw new Error(
      "TikTok publishing is not yet available — pending TikTok app audit for video.publish.",
    );
  },

  async getProfile(
    account: SocialAccount,
  ): Promise<{ openId: string; displayName: string }> {
    const accessToken = decryptToken(account.accessToken);
    return fetchProfile(accessToken);
  },
};
