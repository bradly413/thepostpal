import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { getAdInsights } from "@/lib/meta-ads";
import {
  assertMetaAdsLocationAccess,
  loadMetaAdsUserToken,
  MetaAdsAccessError,
} from "@/lib/meta-ads-db";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");
    const adAccountId = request.nextUrl.searchParams.get("adAccountId");
    const datePreset = request.nextUrl.searchParams.get("date_preset") || "last_7d";

    if (!locationId || !adAccountId) {
      return NextResponse.json(
        { error: "locationId and adAccountId are required" },
        { status: 400 },
      );
    }

    return await withTenantDb(auth, async (tx) => {
      try {
        await assertMetaAdsLocationAccess(auth, tx, locationId);
        const token = await loadMetaAdsUserToken(auth, tx, locationId);
        const insights = await getAdInsights(adAccountId, token, {
          date_preset: datePreset,
        });
        return NextResponse.json({ insights });
      } catch (err) {
        if (err instanceof MetaAdsAccessError) {
          const status = err.code === "FEATURE_OFF" ? 404 : 403;
          return NextResponse.json({ error: err.message }, { status });
        }
        const msg = err instanceof Error ? err.message : "Insights unavailable";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
