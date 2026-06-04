import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledPosts } from "@/lib/cron-publish";
import { withCronDb } from "@/lib/db";

export const runtime = "nodejs";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
