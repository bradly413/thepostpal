import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthContext } from "@/lib/api-auth";
import { tiktokProvider } from "@/lib/social/providers/tiktok";
import { resolveTikTokRedirectUri } from "@/lib/social/providers/tiktok-routes";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";

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
 * GET /api/auth/tiktok/login?locationId=...
 * Starts TikTok OAuth. Inert without TIKTOK_CLIENT_KEY — fails gracefully with a
 * redirect rather than crashing.
 */
export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    const next = encodeURIComponent("/dashboard/settings");
    return NextResponse.redirect(new URL(`/sign-in?next=${next}`, req.url));
  }

  if (!process.env.TIKTOK_CLIENT_KEY?.trim()) {
    return redirectWithError(
      req,
      "TikTok is not configured (TIKTOK_CLIENT_KEY).",
    );
  }

  const requestedLocationId = req.nextUrl.searchParams.get("locationId");
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

  let redirectUrl: string;
  try {
    const state = randomUUID();
    const redirectUri = resolveTikTokRedirectUri(req);
    redirectUrl = tiktokProvider.getAuthUrl(state, redirectUri);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("tiktok_oauth_state", state, cookieOpts(600));
    response.cookies.set("tiktok_oauth_location_id", locationId, cookieOpts(600));
    return response;
  } catch (err) {
    console.error(
      "[api/auth/tiktok/login] failed to start OAuth:",
      err instanceof Error ? err.message : err,
    );
    return redirectWithError(
      req,
      "TikTok is not configured correctly. Please try again later.",
    );
  }
}

export const dynamic = "force-dynamic";
