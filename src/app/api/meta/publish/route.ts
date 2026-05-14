import { NextRequest, NextResponse } from "next/server";
import { publishToFacebook, publishToInstagram } from "@/lib/meta";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, pageId, igAccountId, caption, imageUrl, scheduledTime } = body;

    const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!pageToken || !pageId) {
      return NextResponse.json({ error: "Not connected to Facebook" }, { status: 400 });
    }

    const results: { facebook?: unknown; instagram?: unknown } = {};

    if (platform === "facebook" || platform === "both") {
      results.facebook = await publishToFacebook(pageId, pageToken, {
        message: caption,
        imageUrl,
        scheduledTime,
      });
    }

    if ((platform === "instagram" || platform === "both") && igAccountId) {
      if (!imageUrl) {
        return NextResponse.json({ error: "Instagram requires an image" }, { status: 400 });
      }
      results.instagram = await publishToInstagram(igAccountId, pageToken, {
        caption,
        imageUrl,
        scheduledTime,
      });
    }

    if ((platform === "instagram" || platform === "both") && !igAccountId) {
      return NextResponse.json({ error: "No Instagram business account linked to this page" }, { status: 400 });
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
