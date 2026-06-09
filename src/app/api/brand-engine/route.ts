import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { mapIndustryToVerticalSlug } from "@/lib/compliance/vertical-mapping";

// ─────────────────────────────────────────────────────────────
//  /api/brand-engine  — read/write the tenant's Brand Engine DNA
//
//  brandEngine is an org-level JSON column on Organization. It feeds
//  the AI generate pipelines (readBrandEngineDna in
//  src/lib/brand-engine-dna.ts) for caption + image context.
//
//  GET  → { brandEngine }
//  PUT  body { niche, primaryTone|pivotAnswer, contrastVibe|paletteVibe,
//             typographyPairing? } → persists, returns { brandEngine }
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true },
      });
      return NextResponse.json({ brandEngine: org?.brandEngine ?? null });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const body = (await request.json()) as Record<string, unknown>;

      const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
      const niche = str(body.niche);
      const primaryTone = str(body.primaryTone) ?? str(body.pivotAnswer) ?? str(body.tone);
      const contrastVibe =
        typeof body.contrastVibe === "number" || typeof body.contrastVibe === "string"
          ? body.contrastVibe
          : typeof body.paletteVibe === "number" || typeof body.paletteVibe === "string"
            ? body.paletteVibe
            : undefined;

      if (!niche) {
        return NextResponse.json({ error: "niche is required" }, { status: 400 });
      }

      // Persisted shape — superset of BrandEngineDna so the read helpers and
      // the AI pipelines (caption + image) pick it up directly.
      const brandEngine: Record<string, unknown> = {
        niche,
        ...(primaryTone ? { primaryTone } : {}),
        ...(contrastVibe !== undefined ? { contrastVibe } : {}),
        ...(str(body.typographyPairing) ? { typographyPairing: str(body.typographyPairing) } : {}),
        updatedAt: new Date().toISOString(),
      };

      // Map the tenant's industry/niche to a compliance vertical and persist it
      // alongside the brand engine. Idempotent + non-destructive: we only SET a
      // verticalSlug when the mapping is confident AND the org doesn't already
      // have one — never overwrite an existing non-null verticalSlug with null.
      const mappedSlug =
        mapIndustryToVerticalSlug(str(body.industryId)) ?? mapIndustryToVerticalSlug(niche);

      const data: Prisma.OrganizationUpdateInput = {
        brandEngine: brandEngine as Prisma.InputJsonValue,
      };
      if (mappedSlug) {
        const existing = await tx.organization.findUnique({
          where: { id: auth.tenantId },
          select: { verticalSlug: true },
        });
        if (!existing?.verticalSlug) {
          data.verticalSlug = mappedSlug;
        }
      }

      const org = await tx.organization.update({
        where: { id: auth.tenantId },
        data,
        select: { brandEngine: true },
      });

      return NextResponse.json({ brandEngine: org.brandEngine });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
