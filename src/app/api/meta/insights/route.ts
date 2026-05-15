import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`meta-insights:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const metaCookie = req.cookies.get("meta_connection")?.value;
  let connection: { pageId: string; pageToken: string; igAccountId: string | null } | null = null;
  try {
    if (metaCookie) connection = JSON.parse(metaCookie);
  } catch { /* invalid cookie */ }

  const pageId = connection?.pageId;
  const pageToken = connection?.pageToken;
  const igAccountId = connection?.igAccountId;

  if (!pageId || !pageToken) {
    return NextResponse.json({ error: "Not connected to Meta" }, { status: 400 });
  }

  try {
    const [pageInfo, pagePosts, igInfo] = await Promise.all([
      fetch(
        `${GRAPH}/${pageId}?fields=name,followers_count,fan_count,picture{url}&access_token=${pageToken}`
      ).then((r) => r.json()),

      fetch(
        `${GRAPH}/${pageId}/posts?fields=id,message,created_time,full_picture,shares,likes.summary(true),comments.summary(true)&limit=10&access_token=${pageToken}`
      ).then((r) => r.json()),

      igAccountId
        ? fetch(
            `${GRAPH}/${igAccountId}?fields=username,profile_picture_url,followers_count,media_count,biography&access_token=${pageToken}`
          ).then((r) => r.json())
        : null,
    ]);

    let igMedia = null;
    if (igAccountId) {
      const mediaRes = await fetch(
        `${GRAPH}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${pageToken}`
      );
      igMedia = await mediaRes.json();
    }

    return NextResponse.json({
      page: pageInfo,
      posts: pagePosts,
      instagram: igInfo,
      igMedia,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch insights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
