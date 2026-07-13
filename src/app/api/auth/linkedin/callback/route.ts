import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { linkedinProvider } from "@/lib/social/providers/linkedin";
import { resolveLinkedInRedirectUri } from "@/lib/social/providers/linkedin-routes";
import { persistLinkedInSocialAccount } from "@/lib/social/social-account-db";
import { SOLO_MAX_CONNECTED_PROFILES } from "@/lib/social-profile-limits";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";
import {
  parseSocialOAuthReturnTo,
  SOCIAL_OAUTH_RETURN_TO_COOKIE,
  socialOAuthErrorPath,
  socialOAuthSuccessPath,
} from "@/lib/social-oauth-return";

function linkError(req: NextRequest, message: string) {
  const returnTo = parseSocialOAuthReturnTo(
    req.cookies.get(SOCIAL_OAUTH_RETURN_TO_COOKIE)?.value,
  );
  return NextResponse.redirect(
    new URL(socialOAuthErrorPath(returnTo, message, "linkedin"), req.url),
  );
}

/**
 * GET /api/auth/linkedin/callback
 * Exchanges code → access token (+ userinfo), saves a LinkedIn SocialAccount row.
 */
export async function GET(req: NextRequest) {
  const returnTo = parseSocialOAuthReturnTo(
    req.cookies.get(SOCIAL_OAUTH_RETURN_TO_COOKIE)?.value,
  );
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg =
      req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return linkError(req, msg);
  }

  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("linkedin_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return linkError(req, "Invalid OAuth state. Please try connecting again.");
  }

  const session = await getSession();
  if (!session) {
    const next =
      returnTo === "onboarding"
        ? "/onboarding?connect=linkedin"
        : "/dashboard/settings";
    return NextResponse.redirect(
      new URL(
        `/sign-in?next=${encodeURIComponent(next)}&linkedin_error=${encodeURIComponent("Sign in required to connect LinkedIn")}`,
        req.url,
      ),
    );
  }

  const cookieLocationId = req.cookies.get("linkedin_oauth_location_id")?.value;

  try {
    const auth = await requireAuthContext();
    const locationId = await resolveMetaConnectLocationId(
      auth.tenantId,
      auth.userId,
      cookieLocationId,
    );

    if (!locationId) {
      return linkError(
        req,
        "Finish setting up your workspace before connecting LinkedIn.",
      );
    }

    const redirectUri = resolveLinkedInRedirectUri(req);
    const accounts = await linkedinProvider.exchangeCode(code, redirectUri);
    const account = accounts[0];
    if (!account) {
      return linkError(req, "No LinkedIn profile returned.");
    }

    await withTenantDb(auth, async (tx) => {
      await persistLinkedInSocialAccount(auth, tx, {
        locationId,
        accountId: account.accountId,
        accountName: account.accountName,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken ?? null,
        tokenExpiresAt: account.expiresAt ?? null,
      });
    });

    const response = NextResponse.redirect(
      new URL(socialOAuthSuccessPath(returnTo, "linkedin"), req.url),
    );
    response.cookies.delete("linkedin_oauth_state");
    response.cookies.delete("linkedin_oauth_location_id");
    response.cookies.delete(SOCIAL_OAUTH_RETURN_TO_COOKIE);
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      const next =
        returnTo === "onboarding"
          ? "/onboarding?connect=linkedin"
          : "/dashboard/settings";
      return NextResponse.redirect(
        new URL(
          `/sign-in?next=${encodeURIComponent(next)}&linkedin_error=${encodeURIComponent("Sign in required to connect LinkedIn")}`,
          req.url,
        ),
      );
    }

    if (err instanceof Error && err.message === "SOLO_PROFILE_LIMIT") {
      return linkError(
        req,
        `Solo includes up to ${SOLO_MAX_CONNECTED_PROFILES} connected social profiles.`,
      );
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return linkError(
        req,
        "You don't have access to this location. Switch locations in the dashboard and try again.",
      );
    }

    console.error(
      "[api/auth/linkedin/callback] connection failed:",
      err instanceof Error ? err.message : err,
    );
    return linkError(req, "Couldn't connect to LinkedIn — please try again.");
  }
}

export const dynamic = "force-dynamic";
