import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  getInstagramAccount,
  getLongLivedToken,
  getPages,
  META_AUTH_REDIRECT_URI,
} from "@/lib/meta";
import { getSession } from "@/lib/auth";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { persistMetaSocialAccounts } from "@/lib/social/social-account-db";
import { persistMetaBundle } from "@/lib/meta-social-db";
import { SOLO_MAX_CONNECTED_PROFILES } from "@/lib/social-profile-limits";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";

/**
 * GET /api/auth/meta/callback
 * Exchanges code → long-lived token, loads Pages/IG, saves SocialAccount rows.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg =
      req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return NextResponse.redirect(
      new URL(`/dashboard/settings?meta_error=${encodeURIComponent(msg)}`, req.url),
    );
  }

  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("meta_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?meta_error=Invalid+OAuth+state.+Please+try+connecting+again.",
        req.url,
      ),
    );
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
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?meta_error=${encodeURIComponent("Finish setting up your workspace before connecting Meta.")}`,
          req.url,
        ),
      );
    }

    const { access_token: shortToken } = await exchangeCode(code, META_AUTH_REDIRECT_URI);
    const long = await getLongLivedToken(shortToken);
    const pages = await getPages(long.access_token);

    if (!pages.length) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?meta_error=No+Facebook+Pages+found", req.url),
      );
    }

    const page = pages[0];
    const igId = (await getInstagramAccount(page.id, page.access_token)) || null;
    const tokenExpiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000)
      : null;

    await withTenantDb(auth, async (tx) => {
      await persistMetaSocialAccounts(auth, tx, {
        locationId,
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        igAccountId: igId,
        tokenExpiresAt,
      });
      await persistMetaBundle(auth, tx, {
        locationId,
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        igAccountId: igId,
      });
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/settings?meta_connected=1", req.url),
    );
    response.cookies.delete("meta_oauth_state");
    response.cookies.delete("meta_oauth_location_id");
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
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?meta_error=${encodeURIComponent(`Solo includes up to ${SOLO_MAX_CONNECTED_PROFILES} connected social profiles.`)}`,
          req.url,
        ),
      );
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?meta_error=${encodeURIComponent("You don't have access to this location. Switch locations in the dashboard and try again.")}`,
          req.url,
        ),
      );
    }

    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(
      new URL(`/dashboard/settings?meta_error=${encodeURIComponent(msg)}`, req.url),
    );
  }
}

export const dynamic = "force-dynamic";
