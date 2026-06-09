import "server-only";

import type { NextRequest } from "next/server";

/**
 * The LinkedIn OAuth redirect URI MUST be byte-identical on the login and
 * callback legs (LinkedIn validates it). Prefer an explicit env override, then
 * NEXT_PUBLIC_APP_URL, then the request origin as a last resort.
 */
export function resolveLinkedInRedirectUri(req: NextRequest): string {
  const explicit = process.env.LINKEDIN_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/api/auth/linkedin/callback`;
  }

  return new URL("/api/auth/linkedin/callback", req.url).toString();
}
