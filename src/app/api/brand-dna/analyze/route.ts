import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { resolveBrandBookAuth } from "@/lib/onboarding-auth";
import { extractPaletteFromImageBytes } from "@/lib/brand-dna/image-decode";
import { assembleBrandDna } from "@/lib/brand-dna/profile";
import {
  INGEST_LIMITS,
  isAnalyzableImageType,
  sanitizeCaptions,
} from "@/lib/brand-dna/ingest";
import { enrichBrandDna } from "@/lib/brand-dna/semantic-enrichment";

export const runtime = "nodejs";

// Opt-in model semantics (tone/pillars + vision) spend money, so they ride a
// hard per-tenant/day cap on top of the burst limit.
const ENRICH_DAILY_CAP = 25;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
type EnrichMode = "voice" | "visual" | "all";
function parseEnrich(v: FormDataEntryValue | null): EnrichMode | null {
  return v === "voice" || v === "visual" || v === "all" ? v : null;
}

// ─────────────────────────────────────────────────────────────
//  POST /api/brand-dna/analyze  (multipart/form-data)
//
//  Upload-first ingestion for smart onboarding. Accepts the user's own captions
//  + post images and returns a deterministic Brand DNA profile (voice fingerprint
//  + aggregated brand palette + signature vocabulary). No paid AI call — this is
//  bounded local compute (image decode + math) — so it's gated by auth + a normal
//  rate limit + strict input caps rather than a spend cap. Model-based semantic
//  enrichment (tone/pillars) is a follow-up that would add the paid daily cap.
//
//  Form fields:
//    captions: JSON array (or newline-delimited) of caption strings
//    image:    one or more image files (repeatable)
//  Response: { profile, authMode }
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Guest-capable to fit the pre-sign-in onboarding funnel (mirrors
  // /api/brand-book/generate). Keys the rate limit per tenant when signed in.
  const brandAuth = await resolveBrandBookAuth();
  const actor =
    brandAuth.mode === "session"
      ? { tenantId: brandAuth.auth.tenantId, userId: brandAuth.auth.userId }
      : null;

  try {
    if (!(await rateLimit(buildRateLimitKey("brand-dna-analyze", req.headers, actor), 10, 60_000))) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with captions and/or images." },
      { status: 400 },
    );
  }

  const captions = sanitizeCaptions(form.get("captions"));

  // Validate images up front (type + size), capped to the sampling depth.
  const uploads = form
    .getAll("image")
    .filter((e): e is File => typeof e !== "string")
    .slice(0, INGEST_LIMITS.maxImages)
    .filter((f) => isAnalyzableImageType(f.type) && f.size <= INGEST_LIMITS.maxImageBytes);

  if (captions.length === 0 && uploads.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one caption or one image to analyze." },
      { status: 400 },
    );
  }

  // Decode each image to its palette; keep the buffers in case the optional
  // vision enrichment is requested. Skip any image that fails to decode.
  const imagePalettes = [];
  const buffers: Buffer[] = [];
  for (const file of uploads) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      imagePalettes.push(await extractPaletteFromImageBytes(buffer, 5));
      buffers.push(buffer);
    } catch (err) {
      console.warn("[brand-dna/analyze] skipped undecodable image:", err instanceof Error ? err.message : err);
    }
  }

  const profile = assembleBrandDna({ captions, imagePalettes });

  // Optional, opt-in model enrichment (PAID). Gated behind the daily cap.
  const enrich = parseEnrich(form.get("enrich"));
  if (!enrich) {
    return NextResponse.json({ profile, authMode: brandAuth.mode });
  }

  try {
    if (
      !(await rateLimit(
        buildRateLimitKey("brand-dna-enrich-day", req.headers, actor),
        ENRICH_DAILY_CAP,
        ONE_DAY_MS,
      ))
    ) {
      return NextResponse.json(
        { error: "Daily enrichment limit reached. Try again tomorrow.", profile, authMode: brandAuth.mode },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const enrichment = await enrichBrandDna({
    captions: enrich === "visual" ? [] : captions,
    images: enrich === "voice" ? [] : buffers,
  });
  return NextResponse.json({ profile, enrichment, authMode: brandAuth.mode });
}
