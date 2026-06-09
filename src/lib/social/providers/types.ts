import "server-only";

import type { SocialAccount } from "@prisma/client";

export interface PublishPayload {
  caption: string;
  mediaUrls?: string[];
  mediaType: "IMAGE" | "VIDEO" | "TEXT";
}

export interface ExchangedAccount {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  accountId: string;
  accountName: string;
  /** e.g. "facebook" | "instagram" for Meta; undefined for single-surface providers. */
  providerSubtype?: string;
}

export interface SocialProvider {
  id: string;
  getAuthUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<ExchangedAccount[]>;
  /**
   * Refresh an account's access token. Implementations receive the full
   * SocialAccount row (so they can read both the encrypted `accessToken` and the
   * encrypted `refreshToken`), decrypt internally, and return fresh PLAINTEXT
   * token(s) — the caller is responsible for re-encrypting before persistence.
   */
  refreshToken(
    account: import("@prisma/client").SocialAccount,
  ): Promise<{
    newAccessToken: string;
    newRefreshToken?: string;
    newExpiresAt?: Date | null;
  }>;
  publish(
    account: SocialAccount,
    payload: PublishPayload,
  ): Promise<{ postId: string }>;
}
