import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import {
  assertMetaAdsLocationAccess,
  loadFacebookPageForAds,
  loadMetaAdsUserToken,
  MetaAdsAccessError,
} from "@/lib/meta-ads-db";
import { launchPausedMetaAd, type MetaCampaignObjective } from "@/lib/meta-ads-launch";

const OBJECTIVES = new Set<MetaCampaignObjective>([
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
]);

function absolutizeUrl(imageUrl: string, origin: string): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return `${origin}${imageUrl}`;
  }
  return imageUrl;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = (await request.json()) as Record<string, unknown>;

    const locationId = typeof body.locationId === "string" ? body.locationId : "";
    const adAccountId = typeof body.adAccountId === "string" ? body.adAccountId : "";
    const objective = typeof body.objective === "string" ? body.objective : "";
    const campaignName =
      typeof body.campaignName === "string" && body.campaignName.trim()
        ? body.campaignName.trim()
        : "Posterboy campaign";
    const dailyBudgetCents =
      typeof body.dailyBudgetCents === "number" ? body.dailyBudgetCents : 0;
    const startTime =
      typeof body.startTime === "string" ? body.startTime : new Date().toISOString();
    const endTime = typeof body.endTime === "string" ? body.endTime : undefined;
    const message = typeof body.message === "string" ? body.message : "";
    const link = typeof body.link === "string" ? body.link : "";
    const callToAction =
      typeof body.callToAction === "string" ? body.callToAction : "LEARN_MORE";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const geoCountries = Array.isArray(body.geoCountries)
      ? body.geoCountries.filter((c): c is string => typeof c === "string")
      : ["US"];
    const ageMin = typeof body.ageMin === "number" ? body.ageMin : 25;
    const ageMax = typeof body.ageMax === "number" ? body.ageMax : 55;

    if (!locationId || !adAccountId || !OBJECTIVES.has(objective as MetaCampaignObjective)) {
      return NextResponse.json({ error: "Invalid launch payload" }, { status: 400 });
    }
    if (!message.trim() || !link.trim() || !imageUrl.trim() || dailyBudgetCents < 100) {
      return NextResponse.json({ error: "Message, link, image, and budget are required" }, { status: 400 });
    }

    const origin = request.nextUrl.origin;

    return await withTenantDb(auth, async (tx) => {
      try {
        await assertMetaAdsLocationAccess(auth, tx, locationId);
        const userToken = await loadMetaAdsUserToken(auth, tx, locationId);
        const page = await loadFacebookPageForAds(auth, tx, locationId);

        const result = await launchPausedMetaAd({
          adAccountId,
          userToken,
          pageId: page.pageId,
          campaignName,
          objective: objective as MetaCampaignObjective,
          dailyBudgetCents,
          startTime,
          endTime,
          geoCountries: geoCountries.length > 0 ? geoCountries : ["US"],
          ageMin,
          ageMax,
          message: message.trim(),
          link: link.trim(),
          callToAction,
          imageUrl: absolutizeUrl(imageUrl.trim(), origin),
        });

        return NextResponse.json({
          ...result,
          message: "Created as PAUSED in Meta Ads Manager",
        });
      } catch (err) {
        if (err instanceof MetaAdsAccessError) {
          const status = err.code === "FEATURE_OFF" ? 404 : 403;
          return NextResponse.json({ error: err.message }, { status });
        }
        const msg = err instanceof Error ? err.message : "Launch failed";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
