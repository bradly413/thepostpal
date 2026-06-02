import { NextRequest, NextResponse } from "next/server";
import { publishToFacebook, publishToInstagram } from "@/lib/meta";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { loadMetaBundleSecrets } from "@/lib/meta-social-db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const ip = getClientIp(req.headers);
    if (!rateLimit(`meta-publish:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { platform, caption, imageUrl, scheduledTime, locationId } = body;

    if (!locationId || typeof locationId !== "string") {
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

      const pageToken = secrets?.pageToken || process.env.META_PAGE_ACCESS_TOKEN;
      const pageId = secrets?.pageId;
      const igAccountId = secrets?.igAccountId ?? null;

      if (!pageToken || !pageId) {
        return NextResponse.json(
          { error: "Not connected to Facebook. Connect in Settings, then try again." },
          { status: 400 },
        );
      }

      if (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
        return NextResponse.json(
          { error: "Upload the image first — Meta requires a public image URL." },
          { status: 400 },
        );
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
        return NextResponse.json(
          { error: "No Instagram business account linked to this page" },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, results });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
