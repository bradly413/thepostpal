import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { getAdsLoginUrl } from "@/lib/meta";
import { assertMetaAdsLocationAccess, MetaAdsAccessError } from "@/lib/meta-ads-db";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      try {
        await assertMetaAdsLocationAccess(auth, tx, locationId);
        const state = randomBytes(16).toString("hex");
        const url = getAdsLoginUrl(state);

        const response = NextResponse.json({ url });
        response.cookies.set("meta_ads_oauth_state", state, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 600,
          path: "/",
        });
        response.cookies.set("meta_ads_oauth_location_id", locationId, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 600,
          path: "/",
        });
        return response;
      } catch (err) {
        if (err instanceof MetaAdsAccessError) {
          const status = err.code === "FEATURE_OFF" ? 404 : 403;
          return NextResponse.json({ error: err.message }, { status });
        }
        throw err;
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
