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
   * Refresh an (encrypted) access token. Implementations decrypt internally and
   * return a fresh PLAINTEXT access token — the caller is responsible for
   * re-encrypting before persistence.
   */
  refreshToken(
    encryptedToken: string,
  ): Promise<{ newAccessToken: string; newExpiresAt?: Date | null }>;
  publish(
    account: SocialAccount,
    payload: PublishPayload,
  ): Promise<{ postId: string }>;
}
