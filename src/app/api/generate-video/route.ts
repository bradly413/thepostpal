import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { isProImageEntitled } from "@/lib/plan-features";
import {
  getVeoTask,
  startVeoVideo,
  veoConfigured,
  type VeoAspectRatio,
  type VeoResolution,
} from "@/lib/studio/veo";

export const runtime = "nodejs";
export const maxDuration = 60;

// Video (Veo) rides the Pro images entitlement — expensive generation.
async function entitled(auth: AuthContext): Promise<boolean> {
  try {
    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { plan: true, brandEngine: true },
      });
      return org ? isProImageEntitled(org.plan, org.brandEngine) : false;
    });
  } catch {
    return false;
  }
}

/** POST: create a Veo job → { taskId }. Image optional (text-to-video). */
export async function POST(req: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!(await rateLimit(buildRateLimitKey("gen-video", req.headers, auth), 6, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }
  if (!veoConfigured()) {
    return NextResponse.json({ error: "Video generation isn't configured yet." }, { status: 500 });
  }
  if (!(await entitled(auth))) {
    return NextResponse.json({ error: "Video is a Pro feature.", upgrade: true }, { status: 403 });
  }

  let body: {
    image?: unknown;
    prompt?: unknown;
    aspectRatio?: unknown;
    resolution?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required for video." }, { status: 400 });
  }
  if (prompt.length > 1024) {
    return NextResponse.json({ error: "Prompt is too long (1024 char max)." }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image : "";
  const aspectRatio: VeoAspectRatio =
    body.aspectRatio === "9:16" || body.aspectRatio === "16:9"
      ? body.aspectRatio
      : "16:9";
  const resolution: VeoResolution =
    body.resolution === "1080p" || body.resolution === "4k" || body.resolution === "720p"
      ? body.resolution
      : "720p";

  try {
    const taskId = await startVeoVideo({
      prompt,
      image: image || null,
      aspectRatio,
      resolution,
    });
    return NextResponse.json({ taskId, status: "submitted" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/generate-video] create failed:", msg);
    return NextResponse.json(
      { error: msg.includes("GEMINI") ? "Video generation isn't configured yet." : "Couldn't start the video. Try again." },
      { status: 502 },
    );
  }
}

/** GET ?taskId=…: poll status → { status, videoUrl?, error? }. */
export async function GET(req: NextRequest) {
  try {
    await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  try {
    const task = await getVeoTask(taskId);
    return NextResponse.json(task);
  } catch (err) {
    console.error("[api/generate-video] poll failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't check the video status." }, { status: 502 });
  }
}
