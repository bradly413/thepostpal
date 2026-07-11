import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthContext } from "@/lib/api-auth";
import { getAuthLoginUrl } from "@/lib/meta";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";
import {
  META_OAUTH_RETURN_TO_COOKIE,
  parseMetaOAuthReturnTo,
} from "@/lib/meta-oauth-pending";

function cookieOpts(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    path: "/",
    maxAge,
    sameSite: "lax" as const,
    httpOnly: true,
    secure,
  };
}

function redirectWithError(req: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(
      `/dashboard/settings?meta_error=${encodeURIComponent(message)}`,
      req.url,
    ),
  );
}

/**
 * GET /api/auth/meta/login?locationId=...
 * Starts Meta OAuth for Facebook Page + Instagram Business publishing.
 */
export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    const next = encodeURIComponent("/dashboard/settings");
    return NextResponse.redirect(new URL(`/sign-in?next=${next}`, req.url));
  }

  const appId =
    process.env.META_CLIENT_ID || process.env.NEXT_PUBLIC_META_APP_ID || "";
  if (!appId) {
    return redirectWithError(
      req,
      "Meta App ID not configured (META_CLIENT_ID)",
    );
  }

  const requestedLocationId = req.nextUrl.searchParams.get("locationId");
  const returnTo = parseMetaOAuthReturnTo(req.nextUrl.searchParams.get("returnTo"));
  const locationId = await resolveMetaConnectLocationId(
    auth.tenantId,
    auth.userId,
    requestedLocationId,
  );

  if (!locationId) {
    return redirectWithError(
      req,
      "Your workspace is still setting up. Refresh the page, then try Connect again.",
    );
  }

  const state = randomUUID();
  const redirectUrl = getAuthLoginUrl(state);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("meta_oauth_state", state, cookieOpts(600));
  response.cookies.set("meta_oauth_location_id", locationId, cookieOpts(600));
  response.cookies.set(META_OAUTH_RETURN_TO_COOKIE, returnTo, cookieOpts(600));
  return response;
}

export const dynamic = "force-dynamic";
