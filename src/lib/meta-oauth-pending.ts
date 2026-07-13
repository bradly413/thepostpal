import "server-only";

import { encryptToken, decryptToken } from "@/lib/social/token-crypto";
import {
  parseSocialOAuthReturnTo,
  socialOAuthErrorPath,
  socialOAuthSuccessPath,
  type SocialOAuthReturnTo,
} from "@/lib/social-oauth-return";

export type MetaOAuthReturnTo = SocialOAuthReturnTo;

export interface MetaOAuthPending {
  locationId: string;
  userToken: string;
  tokenExpiresAt: string | null;
  returnTo: MetaOAuthReturnTo;
}

export const META_OAUTH_PENDING_COOKIE = "meta_oauth_pending";
export const META_OAUTH_RETURN_TO_COOKIE = "meta_oauth_return_to";
export const META_OAUTH_PENDING_MAX_AGE = 600;

export function sealMetaOAuthPending(payload: MetaOAuthPending): string {
  return encryptToken(JSON.stringify(payload));
}

export function openMetaOAuthPending(sealed: string): MetaOAuthPending | null {
  try {
    const raw = decryptToken(sealed);
    const parsed = JSON.parse(raw) as Partial<MetaOAuthPending>;
    if (
      typeof parsed.locationId !== "string" ||
      typeof parsed.userToken !== "string" ||
      (parsed.returnTo !== "organization" &&
        parsed.returnTo !== "settings" &&
        parsed.returnTo !== "onboarding")
    ) {
      return null;
    }
    return {
      locationId: parsed.locationId,
      userToken: parsed.userToken,
      tokenExpiresAt:
        typeof parsed.tokenExpiresAt === "string" ? parsed.tokenExpiresAt : null,
      returnTo: parsed.returnTo,
    };
  } catch {
    return null;
  }
}

export function metaConnectSuccessPath(returnTo: MetaOAuthReturnTo): string {
  return socialOAuthSuccessPath(returnTo, "meta");
}

export function metaConnectErrorPath(returnTo: MetaOAuthReturnTo, message: string): string {
  return socialOAuthErrorPath(returnTo, message, "meta");
}

export function parseMetaOAuthReturnTo(value: string | null | undefined): MetaOAuthReturnTo {
  return parseSocialOAuthReturnTo(value);
}
