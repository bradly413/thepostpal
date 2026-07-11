import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  getLongLivedToken,
  getPages,
  META_AUTH_REDIRECT_URI,
} from "@/lib/meta";
import { getSession } from "@/lib/auth";
import { requireAuthContext } from "@/lib/api-auth";
import { SOLO_MAX_CONNECTED_PROFILES } from "@/lib/social-profile-limits";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";
import { completeMetaPageConnection } from "@/lib/meta-connect-complete";
import {
  META_OAUTH_PENDING_COOKIE,
  META_OAUTH_PENDING_MAX_AGE,
  META_OAUTH_RETURN_TO_COOKIE,
  metaConnectErrorPath,
  metaConnectSuccessPath,
  parseMetaOAuthReturnTo,
  sealMetaOAuthPending,
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

/**
 * GET /api/auth/meta/callback
 * Exchanges code → long-lived token, then either auto-connects (one Page)
 * or sends the user to the Page picker when they manage multiple Pages.
 */
export async function GET(req: NextRequest) {
  const returnTo = parseMetaOAuthReturnTo(
    req.cookies.get(META_OAUTH_RETURN_TO_COOKIE)?.value,
  );

  const redirectError = (message: string) =>
    NextResponse.redirect(new URL(metaConnectErrorPath(returnTo, message), req.url));

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg =
      req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return redirectError(msg);
  }

  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("meta_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return redirectError("Invalid OAuth state. Please try connecting again.");
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL(
        "/sign-in?next=%2Fdashboard%2Fsettings&meta_error=Sign+in+required+to+connect+Meta",
        req.url,
      ),
    );
  }

  const cookieLocationId = req.cookies.get("meta_oauth_location_id")?.value;

  try {
    const auth = await requireAuthContext();
    const locationId = await resolveMetaConnectLocationId(
      auth.tenantId,
      auth.userId,
      cookieLocationId,
    );

    if (!locationId) {
      return redirectError("Finish setting up your workspace before connecting Meta.");
    }

    const { access_token: shortToken } = await exchangeCode(code, META_AUTH_REDIRECT_URI);
    const long = await getLongLivedToken(shortToken);
    const pages = await getPages(long.access_token);

    if (!pages.length) {
      return redirectError("No Facebook Pages found");
    }

    const tokenExpiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000)
      : null;

    const clearOAuthCookies = (response: NextResponse) => {
      response.cookies.delete("meta_oauth_state");
      response.cookies.delete("meta_oauth_location_id");
      response.cookies.delete(META_OAUTH_RETURN_TO_COOKIE);
    };

    if (pages.length === 1) {
      await completeMetaPageConnection(auth, locationId, pages[0], tokenExpiresAt);
      const response = NextResponse.redirect(
        new URL(metaConnectSuccessPath(returnTo), req.url),
      );
      clearOAuthCookies(response);
      return response;
    }

    const response = NextResponse.redirect(
      new URL("/dashboard/connect/meta", req.url),
    );
    response.cookies.set(
      META_OAUTH_PENDING_COOKIE,
      sealMetaOAuthPending({
        locationId,
        userToken: long.access_token,
        tokenExpiresAt: tokenExpiresAt?.toISOString() ?? null,
        returnTo,
      }),
      cookieOpts(META_OAUTH_PENDING_MAX_AGE),
    );
    clearOAuthCookies(response);
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.redirect(
        new URL(
          "/sign-in?next=%2Fdashboard%2Fsettings&meta_error=Sign+in+required+to+connect+Meta",
          req.url,
        ),
      );
    }

    if (err instanceof Error && err.message === "SOLO_PROFILE_LIMIT") {
      return redirectError(
        `Solo includes up to ${SOLO_MAX_CONNECTED_PROFILES} connected social profiles.`,
      );
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return redirectError(
        "You don't have access to this location. Switch locations and try again.",
      );
    }

    console.error(
      "[api/auth/meta/callback] connection failed:",
      err instanceof Error ? err.message : err,
    );
    return redirectError("Couldn't connect to Meta — please try again.");
  }
}

export const dynamic = "force-dynamic";
