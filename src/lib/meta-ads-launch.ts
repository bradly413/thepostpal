import "server-only";

import {
  createAd,
  createAdCreative,
  createAdSet,
  createCampaign,
  uploadAdImage,
  type MetaCampaignObjective,
} from "@/lib/meta-ads";

export type { MetaCampaignObjective };

export interface MetaAdsLaunchPayload {
  adAccountId: string;
  userToken: string;
  pageId: string;
  campaignName: string;
  objective: MetaCampaignObjective;
  dailyBudgetCents: number;
  startTime: string;
  endTime?: string;
  geoCountries: string[];
  ageMin: number;
  ageMax: number;
  message: string;
  link: string;
  callToAction: string;
  imageUrl: string;
}

export interface MetaAdsLaunchResult {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  imageHash: string;
  status: "PAUSED";
}

export async function launchPausedMetaAd(
  payload: MetaAdsLaunchPayload,
): Promise<MetaAdsLaunchResult> {
  const imageHash = await uploadAdImage(
    payload.adAccountId,
    payload.userToken,
    payload.imageUrl,
  );

  const campaign = await createCampaign(payload.adAccountId, payload.userToken, {
    name: payload.campaignName,
    objective: payload.objective,
    special_ad_categories: [],
  });

  const adSet = await createAdSet(payload.adAccountId, payload.userToken, {
    name: `${payload.campaignName} — Ad set`,
    campaign_id: campaign.id,
    daily_budget: payload.dailyBudgetCents,
    billing_event: "IMPRESSIONS",
    optimization_goal: "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: {
      geo_locations: { countries: payload.geoCountries },
      age_min: payload.ageMin,
      age_max: payload.ageMax,
    },
    start_time: payload.startTime,
    end_time: payload.endTime,
  });

  const creative = await createAdCreative(payload.adAccountId, payload.userToken, {
    name: `${payload.campaignName} — Creative`,
    object_story_spec: {
      page_id: payload.pageId,
      link_data: {
        message: payload.message,
        link: payload.link,
        call_to_action: { type: payload.callToAction },
        image_hash: imageHash,
      },
    },
  });

  const ad = await createAd(payload.adAccountId, payload.userToken, {
    name: `${payload.campaignName} — Ad`,
    adset_id: adSet.id,
    creative: { creative_id: creative.id },
  });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    creativeId: creative.id,
    adId: ad.id,
    imageHash,
    status: "PAUSED",
  };
}
