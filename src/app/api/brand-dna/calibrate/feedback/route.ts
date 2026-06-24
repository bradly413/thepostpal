import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { resolveBrandBookAuth } from "@/lib/onboarding-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { sanitizeApproved, mergeExemplars } from "@/lib/brand-dna/calibrate";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-dna/calibrate/feedback
//
//  Record the user's ✓ taps from the calibration loop. Approved captions are
//  merged into the location's exemplar bank (BrandVoiceProfile.preferredPhrases)
//  — the real, user-blessed few-shot examples future generation pulls from.
//  No AI call. Session users with an owned location persist; guests get ok:true
//  (the client holds the approved set until they sign in). Best-effort.
//
//  Body: { approved: string[], locationId?: string }
//  Response: { ok, persisted, exemplarCount }
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const brandAuth = await resolveBrandBookAuth();
  const actor =
    brandAuth.mode === "session"
      ? { tenantId: brandAuth.auth.tenantId, userId: brandAuth.auth.userId }
      : null;

  try {
    if (!(await rateLimit(buildRateLimitKey("brand-dna-calibrate-fb", req.headers, actor), 20, 60_000))) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { approved?: unknown; locationId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const approved = sanitizeApproved(body.approved);
  const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";

  if (approved.length === 0) {
    return NextResponse.json({ ok: true, persisted: false, exemplarCount: 0 });
  }

  if (brandAuth.mode !== "session" || !locationId) {
    // Guest or no location → nothing to persist yet; the client keeps the set.
    return NextResponse.json({ ok: true, persisted: false, exemplarCount: approved.length });
  }

  try {
    const result = await withTenantDb(brandAuth.auth, async (tx) => {
      const access = await resolveAccess(brandAuth.auth.userId, locationId, tx);
      if (!access.hasAccess) return { forbidden: true as const };

      const existing = await tx.brandVoiceProfile.findUnique({
        where: { locationId },
        select: { preferredPhrases: true },
      });
      const merged = mergeExemplars(existing?.preferredPhrases ?? [], approved);
      await tx.brandVoiceProfile.upsert({
        where: { locationId },
        create: { locationId, preferredPhrases: merged },
        update: { preferredPhrases: merged },
      });
      return { exemplarCount: merged.length };
    });

    if ("forbidden" in result) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, persisted: true, exemplarCount: result.exemplarCount });
  } catch (err) {
    console.error("[api/brand-dna/calibrate/feedback] failed:", err instanceof Error ? err.message : err);
    // Best-effort: never fail the user's calibration over a persistence hiccup.
    return NextResponse.json({ ok: true, persisted: false, exemplarCount: approved.length });
  }
}
