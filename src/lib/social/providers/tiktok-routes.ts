import "server-only";

import type { NextRequest } from "next/server";

/**
 * The TikTok OAuth redirect URI MUST be byte-identical on the login and
 * callback legs (TikTok validates it). Prefer an explicit env override, then
 * NEXT_PUBLIC_APP_URL, then the request origin as a last resort.
 */
export function resolveTikTokRedirectUri(req: NextRequest): string {
  const explicit = process.env.TIKTOK_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/api/auth/tiktok/callback`;
  }

  return new URL("/api/auth/tiktok/callback", req.url).toString();
}
