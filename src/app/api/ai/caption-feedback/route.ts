import { Prisma } from "@prisma/client";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { diffSignals, mergeLearning, readVoiceLearning } from "@/lib/ai-voice-learning";

export const runtime = "nodejs";

/**
 * POST /api/ai/caption-feedback
 * Body: { aiOriginal: string, finalCaption: string }
 * Fire-and-forget from the studio when a user publishes an edited caption.
 * Records the edit-diff signal into Organization.brandEngine.voiceLearning so
 * future generations pre-apply how this business reshapes AI drafts.
 */
export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(
      buildRateLimitKey("caption-feedback", req.headers as unknown as Headers, auth),
      30,
      60_000,
    ))) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { aiOriginal?: unknown; finalCaption?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const aiOriginal = typeof body.aiOriginal === "string" ? body.aiOriginal.trim() : "";
  const finalCaption = typeof body.finalCaption === "string" ? body.finalCaption.trim() : "";
  if (!aiOriginal || !finalCaption || aiOriginal.length > 3000 || finalCaption.length > 3000) {
    return Response.json({ ok: true, recorded: false });
  }

  const sig = diffSignals(aiOriginal, finalCaption);
  if (!sig.changed) {
    return Response.json({ ok: true, recorded: false }); // used as-is → no edit signal
  }

  try {
    await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true },
      });
      const existing =
        org?.brandEngine && typeof org.brandEngine === "object"
          ? (org.brandEngine as Record<string, unknown>)
          : {};
      const voiceLearning = mergeLearning(readVoiceLearning(org?.brandEngine), sig);
      await tx.organization.update({
        where: { id: auth.tenantId },
        data: { brandEngine: { ...existing, voiceLearning } as unknown as Prisma.InputJsonObject },
      });
    });
  } catch {
    return Response.json({ ok: true, recorded: false });
  }

  return Response.json({ ok: true, recorded: true });
}
