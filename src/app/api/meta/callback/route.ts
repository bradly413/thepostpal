import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getLongLivedToken, getPages, getInstagramAccount } from "@/lib/meta";
import { getSession } from "@/lib/auth";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { persistMetaBundle } from "@/lib/meta-social-db";
import { SOLO_MAX_CONNECTED_PROFILES } from "@/lib/social-profile-limits";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg = req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return NextResponse.redirect(new URL(`/dashboard/settings?meta_error=${encodeURIComponent(msg)}`, req.url));
  }

  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("meta_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?meta_error=Invalid+OAuth+state.+Please+try+connecting+again.", req.url),
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL("/sign-in?next=%2Fdashboard%2Fsettings&meta_error=Sign+in+required+to+connect+Meta", req.url),
    );
  }

  const locationId = req.cookies.get("meta_oauth_location_id")?.value;
  if (!locationId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?meta_error=Choose+a+location+before+connecting+Meta", req.url),
    );
  }

  try {
    const { access_token: shortToken } = await exchangeCode(code);
    const { access_token: longToken } = await getLongLivedToken(shortToken);
    const pages = await getPages(longToken);

    if (!pages.length) {
      return NextResponse.redirect(new URL("/dashboard/settings?meta_error=No+Facebook+Pages+found", req.url));
    }

    const page = pages[0];
    const igId = await getInstagramAccount(page.id, page.access_token);

    const auth = await requireAuthContext();
    await withTenantDb(auth, async (tx) => {
      await persistMetaBundle(auth, tx, {
        locationId,
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        igAccountId: igId || null,
      });
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/settings?meta_connected=1", req.url),
    );
    response.cookies.delete("meta_oauth_state");
    response.cookies.delete("meta_oauth_location_id");
    response.cookies.delete("meta_connection");
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "SOLO_PROFILE_LIMIT") {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?meta_error=${encodeURIComponent(`Solo includes up to ${SOLO_MAX_CONNECTED_PROFILES} connected social profiles.`)}`,
          req.url,
        ),
      );
    }

    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(new URL(`/dashboard/settings?meta_error=${encodeURIComponent(msg)}`, req.url));
  }
}
