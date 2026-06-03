import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import {
  assertMetaAdsLocationAccess,
  loadMetaAdsUserToken,
  MetaAdsAccessError,
  syncMetaAdAccounts,
} from "@/lib/meta-ads-db";

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
        const token = await loadMetaAdsUserToken(auth, tx, locationId);
        const accounts = await syncMetaAdAccounts(auth, tx, locationId, token);
        return NextResponse.json({ accounts });
      } catch (err) {
        if (err instanceof MetaAdsAccessError) {
          if (err.code === "FEATURE_OFF") {
            return NextResponse.json({ error: err.message }, { status: 404 });
          }
          if (err.code === "NOT_CONNECTED") {
            return NextResponse.json({ error: err.message }, { status: 403 });
          }
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        throw err;
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
