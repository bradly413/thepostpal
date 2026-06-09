import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveTenantVertical, loadVerticalRegistry } from "@/lib/compliance/resolve-vertical-server";

/** GET /api/me/vertical — current tenant compliance vertical + guardrails. */
export async function GET() {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const state = await resolveTenantVertical(tx, auth.tenantId);
      return NextResponse.json(state);
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** POST /api/me/vertical — assign or change compliance vertical. Body: { slug } */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = (await req.json()) as { slug?: unknown };
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      const registry = await loadVerticalRegistry(tx);
      if (registry.size > 0 && !registry.has(slug)) {
        return NextResponse.json({ error: "Unknown vertical slug" }, { status: 400 });
      }

      await tx.organization.update({
        where: { id: auth.tenantId },
        data: { verticalSlug: slug },
      });

      const state = await resolveTenantVertical(tx, auth.tenantId);
      return NextResponse.json(state);
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
