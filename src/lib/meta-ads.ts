import "server-only";

const GRAPH = "https://graph.facebook.com/v25.0";
const PAUSED = "PAUSED" as const;

export type MetaCampaignObjective =
  | "OUTCOME_AWARENESS"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES";

export interface MetaAdAccountSummary {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status?: number;
  business?: { id: string; name: string };
}

export interface CreateCampaignInput {
  name: string;
  objective: MetaCampaignObjective;
  special_ad_categories?: string[];
}

export interface CreateAdSetInput {
  name: string;
  campaign_id: string;
  daily_budget: number;
  billing_event?: string;
  optimization_goal?: string;
  bid_strategy?: string;
  targeting: Record<string, unknown>;
  start_time: string;
  end_time?: string;
}

export interface CreateAdCreativeInput {
  name: string;
  object_story_spec: Record<string, unknown>;
}

export interface CreateAdInput {
  name: string;
  adset_id: string;
  creative: { creative_id: string };
}

function actPath(adAccountId: string): string {
  const bare = adAccountId.replace(/^act_/, "");
  return `act_${bare}`;
}

function withAccessToken(path: string, token: string): string {
  const base = path.startsWith("http") ? path : `${GRAPH}${path}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}access_token=${encodeURIComponent(token)}`;
}

async function graphJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(withAccessToken(path, token), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Meta Marketing API ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function listAdAccounts(userToken: string): Promise<MetaAdAccountSummary[]> {
  const data = await graphJson<{ data?: MetaAdAccountSummary[] }>(
    "/me/adaccounts?fields=name,account_id,currency,account_status,business",
    userToken,
  );
  return data.data ?? [];
}

export async function createCampaign(
  adAccountId: string,
  token: string,
  data: CreateCampaignInput,
): Promise<{ id: string }> {
  return graphJson<{ id: string }>(`/${actPath(adAccountId)}/campaigns`, token, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      status: PAUSED,
    }),
  });
}

export async function createAdSet(
  adAccountId: string,
  token: string,
  data: CreateAdSetInput,
): Promise<{ id: string }> {
  return graphJson<{ id: string }>(`/${actPath(adAccountId)}/adsets`, token, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      status: PAUSED,
    }),
  });
}

export async function uploadAdImage(
  adAccountId: string,
  token: string,
  imageUrl: string,
): Promise<string> {
  const params = new URLSearchParams({
    url: imageUrl,
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/${actPath(adAccountId)}/adimages?${params}`, {
    method: "POST",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Meta ad image upload failed: ${text}`);
  }
  const json = JSON.parse(text) as {
    images?: Record<string, { hash?: string }>;
  };
  const first = Object.values(json.images ?? {})[0];
  if (!first?.hash) {
    throw new Error("Meta ad image upload returned no image_hash");
  }
  return first.hash;
}

export async function createAdCreative(
  adAccountId: string,
  token: string,
  data: CreateAdCreativeInput,
): Promise<{ id: string }> {
  return graphJson<{ id: string }>(`/${actPath(adAccountId)}/adcreatives`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createAd(
  adAccountId: string,
  token: string,
  data: CreateAdInput,
): Promise<{ id: string }> {
  return graphJson<{ id: string }>(`/${actPath(adAccountId)}/ads`, token, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      status: PAUSED,
    }),
  });
}

export async function getAdInsights(
  adAccountId: string,
  token: string,
  params: { date_preset?: string; fields?: string },
): Promise<{ data?: unknown[] }> {
  const fields =
    params.fields ??
    "impressions,clicks,spend,reach,cpc,cpm,ctr,actions";
  const datePreset = params.date_preset ?? "last_7d";
  const path = `/${actPath(adAccountId)}/insights?fields=${encodeURIComponent(fields)}&date_preset=${encodeURIComponent(datePreset)}`;
  return graphJson<{ data?: unknown[] }>(path, token);
}
