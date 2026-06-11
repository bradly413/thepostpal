import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { loadMetaBundleSecrets } from "@/lib/meta-social-db";
import { buildInsightsFromGraph } from "@/lib/meta-insights-parse";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/route-errors";

const GRAPH = "https://graph.facebook.com/v25.0";

function insightWindow(): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 28);
  return {
    since: Math.floor(since.getTime() / 1000).toString(),
    until: Math.floor(until.getTime() / 1000).toString(),
  };
}

async function fetchGraphJson(url: string) {
  const res = await fetch(url);
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    try {
      if (!(await rateLimit(buildRateLimitKey("meta-insights", req.headers, auth), 10, 60_000))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }

    const locationId = req.nextUrl.searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      let secrets;
      try {
        secrets = await loadMetaBundleSecrets(auth, tx, locationId);
      } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        throw error;
      }

      const pageId = secrets?.pageId;
      const pageToken = secrets?.pageToken;
      const igAccountId = secrets?.igAccountId ?? null;

      if (!pageId || !pageToken) {
        return NextResponse.json({ error: "Not connected to Meta" }, { status: 400 });
      }

      const [pageInfo, pagePosts, igInfo] = await Promise.all([
        fetch(
          `${GRAPH}/${pageId}?fields=name,followers_count,fan_count,picture{url}&access_token=${pageToken}`,
        ).then((r) => r.json()),

        fetch(
          `${GRAPH}/${pageId}/posts?fields=id,message,created_time,full_picture,shares,likes.summary(true),comments.summary(true)&limit=10&access_token=${pageToken}`,
        ).then((r) => r.json()),

        igAccountId
          ? fetch(
              `${GRAPH}/${igAccountId}?fields=username,profile_picture_url,followers_count,media_count,biography&access_token=${pageToken}`,
            ).then((r) => r.json())
          : null,
      ]);

      let igMedia = null;
      if (igAccountId) {
        igMedia = await fetchGraphJson(
          `${GRAPH}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${pageToken}`,
        );
      }

      const { since, until } = insightWindow();
      const pageInsights = await fetchGraphJson(
        `${GRAPH}/${pageId}/insights?metric=page_impressions,page_impressions_unique,page_post_engagements,page_engaged_users,page_fans&period=day&since=${since}&until=${until}&access_token=${pageToken}`,
      );

      const igInsights = igAccountId
        ? await fetchGraphJson(
            `${GRAPH}/${igAccountId}/insights?metric=impressions,reach,accounts_engaged&period=day&since=${since}&until=${until}&access_token=${pageToken}`,
          )
        : null;

      const insights = buildInsightsFromGraph({
        pageInfo: pageInfo as Record<string, unknown>,
        pagePosts: pagePosts as { data?: Array<Record<string, unknown>> },
        pageInsights,
        igInfo: igInfo as Record<string, unknown> | null,
        igInsights,
        igMedia: igMedia as { data?: Array<Record<string, unknown>> } | null,
      });

      return NextResponse.json({ insights });
    });
  } catch (error) {
    return handleRouteError("api.meta.insights.GET", error);
  }
}
