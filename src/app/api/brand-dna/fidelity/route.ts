import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { scoreStoredVoiceFidelity } from "@/lib/brand-dna/fidelity";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-dna/fidelity
//
//  Score a draft/generated caption against a location's stored voice fingerprint
//  ("does this sound like them?"). Deterministic, no AI call. Auth + per-location
//  access required. Returns { fidelity: { score, features, sampleCount } } or
//  { fidelity: null } when the location has no analyzed Brand DNA yet.
//
//  Body: { text: string, locationId: string }
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("brand-dna-fidelity", req.headers, auth), 30, 60_000))) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { text?: unknown; locationId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
  if (!text || text.length > 3000) {
    return NextResponse.json({ error: "text (1–3000 chars) is required" }, { status: 400 });
  }
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  try {
    const result = await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) return { forbidden: true as const };
      const fidelity = await scoreStoredVoiceFidelity(tx, locationId, text);
      return { fidelity };
    });

    if ("forbidden" in result) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/brand-dna/fidelity] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Fidelity scoring failed" }, { status: 500 });
  }
}
