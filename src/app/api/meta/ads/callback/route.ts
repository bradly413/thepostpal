import { NextRequest, NextResponse } from "next/server";
import { ADS_REDIRECT_URI, exchangeCode, getLongLivedToken } from "@/lib/meta";
import { getSession } from "@/lib/auth";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { persistMetaAdsUserToken } from "@/lib/meta-ads-db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const msg = req.nextUrl.searchParams.get("error_description") || "Authorization denied";
    return NextResponse.redirect(
      new URL(`/dashboard/ads?meta_ads_error=${encodeURIComponent(msg)}`, req.url),
    );
  }

  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("meta_ads_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/ads?meta_ads_error=Invalid+OAuth+state", req.url),
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL("/sign-in?next=%2Fdashboard%2Fads", req.url),
    );
  }

  const locationId = req.cookies.get("meta_ads_oauth_location_id")?.value;
  if (!locationId) {
    return NextResponse.redirect(
      new URL("/dashboard/ads?meta_ads_error=Missing+location+context", req.url),
    );
  }

  try {
    const { access_token: shortToken } = await exchangeCode(code, ADS_REDIRECT_URI);
    const { access_token: longToken } = await getLongLivedToken(shortToken);

    const auth = await requireAuthContext();
    await withTenantDb(auth, async (tx) => {
      await persistMetaAdsUserToken(auth, tx, locationId, longToken);
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/ads?meta_ads_connected=1", req.url),
    );
    response.cookies.delete("meta_ads_oauth_state");
    response.cookies.delete("meta_ads_oauth_location_id");
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(
      new URL(`/dashboard/ads?meta_ads_error=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
