import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { resolveBrandBookAuth } from "@/lib/onboarding-auth";
import { withTenantDb } from "@/lib/db";
import type { AuthContext } from "@/lib/api-auth";
import {
  extractVoiceProfile,
  MIN_CAPTIONS_FOR_EXTRACTION,
  MAX_CAPTIONS_FOR_EXTRACTION,
} from "@/lib/voice-engine/extract";
import { toImportedExemplars } from "@/lib/voice-engine/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
//  POST /api/voice/extract
//
//  The Voice Engine front door: the user's REAL captions in, a structured
//  VoiceProfile out. Authenticated tenants also get the profile + captions
//  persisted (merged into Organization.brandEngine) so generation is
//  few-shot grounded from day one. Guests (onboarding paste-flow) get the
//  profile back to review; it persists after signup.
//
//  Body: { captions: string[], businessName?, niche?, userBans?: string[] }
//  Response: { profile, stored: boolean }
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const brandAuth = await resolveBrandBookAuth();

  try {
    if (!(await rateLimit(buildRateLimitKey("voice-extract", req.headers), 4, 60_000))) {
      return NextResponse.json(
        { error: "Too many extractions. Wait a moment and retry." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  let body: {
    captions?: unknown;
    businessName?: unknown;
    niche?: unknown;
    userBans?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : undefined;

  const captions = Array.isArray(body.captions)
    ? body.captions
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 600))
        .slice(0, MAX_CAPTIONS_FOR_EXTRACTION)
    : [];

  if (captions.length < MIN_CAPTIONS_FOR_EXTRACTION) {
    return NextResponse.json(
      {
        error: `Paste at least ${MIN_CAPTIONS_FOR_EXTRACTION} captions so the voice is real, not guessed.`,
      },
      { status: 400 },
    );
  }

  const userBans = Array.isArray(body.userBans)
    ? body.userBans
        .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
        .map((b) => b.trim().slice(0, 120))
        .slice(0, 12)
    : [];

  let profile;
  try {
    profile = await extractVoiceProfile(captions, {
      businessName: str(body.businessName, 120),
      niche: str(body.niche, 160),
      userBans,
    });
  } catch (err) {
    console.warn(
      "[voice/extract] extraction failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Couldn't read the voice from those captions. Try again." },
      { status: 502 },
    );
  }

  // Authenticated tenants: persist profile + exemplars (merge, never clobber
  // the rest of brandEngine — DNA, edit-learning, etc. live there too).
  let stored = false;
  if (brandAuth.mode === "session" && brandAuth.auth) {
    try {
      const auth = brandAuth.auth as AuthContext;
      await withTenantDb(auth, async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: auth.tenantId },
          select: { brandEngine: true },
        });
        const existing =
          org?.brandEngine && typeof org.brandEngine === "object"
            ? (org.brandEngine as Record<string, unknown>)
            : {};
        await tx.organization.update({
          where: { id: auth.tenantId },
          data: {
            brandEngine: {
              ...existing,
              voiceProfile: profile,
              importedExemplars: toImportedExemplars(captions, "pasted"),
              voiceProfileUpdatedAt: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      stored = true;
    } catch (err) {
      console.warn(
        "[voice/extract] persist failed (profile still returned):",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({ profile, stored });
}
