import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { tiktokProvider } from "@/lib/social/providers/tiktok";
import { resolveTikTokRedirectUri } from "@/lib/social/providers/tiktok-routes";
import { persistTikTokSocialAccount } from "@/lib/social/social-account-db";
import { SOLO_MAX_CONNECTED_PROFILES } from "@/lib/social-profile-limits";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";

function settingsError(req: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(
      `/dashboard/settings?meta_error=${encodeURIComponent(message)}`,
      req.url,
    ),
  );
}

/**
 * GET /api/auth/tiktok/callback
 * Exchanges code → access token (+ profile), saves a TikTok SocialAccount row.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg =
      req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return settingsError(req, msg);
  }

  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("tiktok_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return settingsError(
      req,
      "Invalid OAuth state. Please try connecting again.",
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL(
        "/sign-in?next=%2Fdashboard%2Fsettings&meta_error=Sign+in+required+to+connect+TikTok",
        req.url,
      ),
    );
  }

  const cookieLocationId = req.cookies.get("tiktok_oauth_location_id")?.value;

  try {
    const auth = await requireAuthContext();
    const locationId = await resolveMetaConnectLocationId(
      auth.tenantId,
      auth.userId,
      cookieLocationId,
    );

    if (!locationId) {
      return settingsError(
        req,
        "Finish setting up your workspace before connecting TikTok.",
      );
    }

    const redirectUri = resolveTikTokRedirectUri(req);
    const accounts = await tiktokProvider.exchangeCode(code, redirectUri);
    const account = accounts[0];
    if (!account) {
      return settingsError(req, "No TikTok profile returned.");
    }

    await withTenantDb(auth, async (tx) => {
      await persistTikTokSocialAccount(auth, tx, {
        locationId,
        accountId: account.accountId,
        accountName: account.accountName,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken ?? null,
        tokenExpiresAt: account.expiresAt ?? null,
      });
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/settings?meta_connected=1", req.url),
    );
    response.cookies.delete("tiktok_oauth_state");
    response.cookies.delete("tiktok_oauth_location_id");
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.redirect(
        new URL(
          "/sign-in?next=%2Fdashboard%2Fsettings&meta_error=Sign+in+required+to+connect+TikTok",
          req.url,
        ),
      );
    }

    if (err instanceof Error && err.message === "SOLO_PROFILE_LIMIT") {
      return settingsError(
        req,
        `Solo includes up to ${SOLO_MAX_CONNECTED_PROFILES} connected social profiles.`,
      );
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return settingsError(
        req,
        "You don't have access to this location. Switch locations in the dashboard and try again.",
      );
    }

    console.error(
      "[api/auth/tiktok/callback] connection failed:",
      err instanceof Error ? err.message : err,
    );
    return settingsError(req, "Couldn't connect to TikTok — please try again.");
  }
}

export const dynamic = "force-dynamic";
