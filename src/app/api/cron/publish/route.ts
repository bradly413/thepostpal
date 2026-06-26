import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processDueScheduledPosts } from "@/lib/cron-publish";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";
// Sequential Meta publishes can take a few seconds each; give the batch room
// so the function isn't killed mid-run (leftover posts retry next tick anyway).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueScheduledPosts();

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
