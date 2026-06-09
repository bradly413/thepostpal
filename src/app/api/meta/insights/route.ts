import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { loadMetaBundleSecrets } from "@/lib/meta-social-db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/route-errors";

const GRAPH = "https://graph.facebook.com/v25.0";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const ip = getClientIp(req.headers);
    if (!rateLimit(`meta-insights:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
        const mediaRes = await fetch(
          `${GRAPH}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${pageToken}`,
        );
        igMedia = await mediaRes.json();
      }

      return NextResponse.json({
        page: pageInfo,
        posts: pagePosts,
        instagram: igInfo,
        igMedia,
      });
    });
  } catch (error) {
    return handleRouteError("api.meta.insights.GET", error);
  }
}
