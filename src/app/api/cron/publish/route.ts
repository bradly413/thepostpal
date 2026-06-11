import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processDueScheduledPosts } from "@/lib/cron-publish";
import { withCronDb } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await withCronDb((tx) => processDueScheduledPosts(tx));

    if (result.processed === 0) {
      return NextResponse.json({
        success: true,
        message: "No posts to publish",
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[CRON_PUBLISH_ERROR]", error);
    Sentry.captureException(error, {
      tags: {
        route: "/api/cron/publish",
        job: "cron_publish",
      },
    });
    await Sentry.flush(2000);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
