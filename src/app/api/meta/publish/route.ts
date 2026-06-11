import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { loadMetaBundleSecrets } from "@/lib/meta-social-db";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import {
  executeMetaPublish,
  resolveMetaPublishCredentials,
} from "@/lib/meta-publish-service";

export async function POST(req: NextRequest) {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("meta-publish", req.headers, auth), 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: {
    platform?: string;
    caption?: string;
    imageUrl?: string;
    videoUrl?: string;
    mediaType?: "image" | "video";
    scheduledTime?: number;
    locationId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { platform, caption, imageUrl, videoUrl, mediaType, scheduledTime, locationId } = body;

  if (!locationId || typeof locationId !== "string") {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  if (platform !== "facebook" && platform !== "instagram" && platform !== "both") {
    return NextResponse.json({ error: "platform must be facebook, instagram, or both" }, { status: 400 });
  }

  try {
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

      const credentials = resolveMetaPublishCredentials(secrets);
      const results = await executeMetaPublish(credentials, {
        platform,
        caption,
        imageUrl,
        videoUrl,
        mediaType,
        scheduledTime,
      });

      return NextResponse.json({
        success: true,
        results: {
          facebook: results.facebook,
          instagram: results.instagram,
        },
        warnings: results.warnings,
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    const lower = message.toLowerCase();
    const status =
      lower.includes("not connected") || lower.includes("requires an image")
        ? 400
        : lower.includes("forbidden")
          ? 403
          : 502;
    console.error("[meta/publish]", message);
    return NextResponse.json({ error: message }, { status });
  }
}
