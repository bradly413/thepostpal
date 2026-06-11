import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { isProImageEntitled } from "@/lib/plan-features";
import { createVideoTask, getVideoTask, klingConfigured } from "@/lib/kling";

export const runtime = "nodejs";
export const maxDuration = 60;

// Video (Kling image-to-video) rides the Pro images entitlement — it's the
// most expensive generation, so plan tier OR the Pro add-on unlocks it.
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

/** POST: create an image-to-video task → { taskId }. */
export async function POST(req: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`gen-video:${getClientIp(req.headers)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!klingConfigured()) {
    return NextResponse.json({ error: "Video generation isn't configured yet." }, { status: 500 });
  }
  if (!(await entitled(auth))) {
    return NextResponse.json({ error: "Video is a Pro feature.", upgrade: true }, { status: 403 });
  }

  let body: { image?: unknown; prompt?: unknown; duration?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const image = typeof body.image === "string" ? body.image : "";
  if (!image) return NextResponse.json({ error: "An image is required to animate" }, { status: 400 });
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const duration = body.duration === 10 ? 10 : 5;

  try {
    const taskId = await createVideoTask({ image, prompt, durationSeconds: duration });
    return NextResponse.json({ taskId, status: "submitted" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/generate-video] create failed:", msg);
    if (msg === "KLING_NO_BALANCE") {
      return NextResponse.json(
        { error: "Out of video credits — top up the Kling account to enable video." },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Couldn't start the video. Try again." }, { status: 502 });
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
    const task = await getVideoTask(taskId);
    return NextResponse.json(task);
  } catch (err) {
    console.error("[api/generate-video] poll failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't check the video status." }, { status: 502 });
  }
}
