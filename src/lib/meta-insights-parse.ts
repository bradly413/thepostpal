import type {
  DashboardMetaInsights,
  InsightDayPoint,
  MetaInsightsTimeSeries,
  MetaTopPost,
} from "@/lib/meta-insights-types";

interface GraphInsightValue {
  value?: number;
  end_time?: string;
}

interface GraphInsightMetric {
  name?: string;
  values?: GraphInsightValue[];
}

interface GraphInsightsResponse {
  data?: GraphInsightMetric[];
  error?: { message?: string };
}

function parseMetricSeries(
  payload: GraphInsightsResponse | null | undefined,
  metricName: string,
): InsightDayPoint[] {
  const metric = payload?.data?.find((m) => m.name === metricName);
  if (!metric?.values?.length) return [];
  return metric.values
    .map((v) => ({
      date: v.end_time ? v.end_time.slice(0, 10) : "",
      value: typeof v.value === "number" ? v.value : 0,
    }))
    .filter((p) => p.date);
}

function sumSeries(points: InsightDayPoint[]): number {
  return points.reduce((acc, p) => acc + p.value, 0);
}

function mergeEngagement(
  pageEngaged: InsightDayPoint[],
  postEngagements: InsightDayPoint[],
): InsightDayPoint[] {
  const byDate = new Map<string, number>();
  for (const p of pageEngaged) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.value);
  for (const p of postEngagements) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.value);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export function buildInsightsFromGraph(input: {
  pageInfo: Record<string, unknown>;
  pagePosts: { data?: Array<Record<string, unknown>> };
  pageInsights: GraphInsightsResponse | null;
  igInfo: Record<string, unknown> | null;
  igInsights: GraphInsightsResponse | null;
  igMedia: { data?: Array<Record<string, unknown>> } | null;
}): DashboardMetaInsights {
  const pageImpressions = parseMetricSeries(input.pageInsights, "page_impressions");
  const pageReach = parseMetricSeries(input.pageInsights, "page_impressions_unique");
  const pageEngaged = parseMetricSeries(input.pageInsights, "page_engaged_users");
  const pagePostEng = parseMetricSeries(input.pageInsights, "page_post_engagements");
  const pageFans = parseMetricSeries(input.pageInsights, "page_fans");

  const igImpressions = parseMetricSeries(input.igInsights, "impressions");
  const igReach = parseMetricSeries(input.igInsights, "reach");
  const igEngagement = parseMetricSeries(input.igInsights, "accounts_engaged");

  const impressions = mergeSeries(pageImpressions, igImpressions);
  const reach = mergeSeries(pageReach, igReach);
  const engagement = mergeEngagement(
    mergeSeries(pageEngaged, igEngagement),
    pagePostEng,
  );

  const series: MetaInsightsTimeSeries = {
    impressions,
    reach,
    engagement,
    followers: pageFans,
  };

  const topPosts: MetaTopPost[] = [];

  for (const post of input.pagePosts.data ?? []) {
    const likes =
      (post.likes as { summary?: { total_count?: number } })?.summary?.total_count ?? 0;
    const comments =
      (post.comments as { summary?: { total_count?: number } })?.summary?.total_count ?? 0;
    const shares = (post.shares as { count?: number })?.count ?? 0;
    topPosts.push({
      id: String(post.id ?? ""),
      platform: "facebook",
      message: String(post.message ?? "").slice(0, 200) || "(No caption)",
      imageUrl: typeof post.full_picture === "string" ? post.full_picture : undefined,
      createdAt: String(post.created_time ?? ""),
      likes,
      comments,
      shares,
      engagement: likes + comments + shares,
    });
  }

  for (const media of input.igMedia?.data ?? []) {
    const likes = typeof media.like_count === "number" ? media.like_count : 0;
    const comments = typeof media.comments_count === "number" ? media.comments_count : 0;
    topPosts.push({
      id: String(media.id ?? ""),
      platform: "instagram",
      message: String(media.caption ?? "").slice(0, 200) || "(No caption)",
      imageUrl:
        typeof media.thumbnail_url === "string"
          ? media.thumbnail_url
          : typeof media.media_url === "string"
            ? media.media_url
            : undefined,
      createdAt: String(media.timestamp ?? ""),
      likes,
      comments,
      shares: 0,
      engagement: likes + comments,
      permalink: typeof media.permalink === "string" ? media.permalink : undefined,
    });
  }

  topPosts.sort((a, b) => b.engagement - a.engagement);

  const pageFollowers =
    typeof input.pageInfo.followers_count === "number"
      ? input.pageInfo.followers_count
      : typeof input.pageInfo.fan_count === "number"
        ? input.pageInfo.fan_count
        : 0;

  return {
    summary: {
      pageName: String(input.pageInfo.name ?? "Facebook Page"),
      pageFollowers,
      igUsername:
        input.igInfo && typeof input.igInfo.username === "string"
          ? input.igInfo.username
          : undefined,
      igFollowers:
        input.igInfo && typeof input.igInfo.followers_count === "number"
          ? input.igInfo.followers_count
          : undefined,
      igMediaCount:
        input.igInfo && typeof input.igInfo.media_count === "number"
          ? input.igInfo.media_count
          : undefined,
      totals: {
        impressions: sumSeries(impressions),
        reach: sumSeries(reach),
        engagement: sumSeries(engagement),
      },
    },
    series,
    topPosts: topPosts.slice(0, 8),
    fetchedAt: new Date().toISOString(),
  };
}

function mergeSeries(a: InsightDayPoint[], b: InsightDayPoint[]): InsightDayPoint[] {
  const byDate = new Map<string, number>();
  for (const p of a) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.value);
  for (const p of b) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.value);
  return [...byDate.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([date, value]) => ({ date, value }));
}
