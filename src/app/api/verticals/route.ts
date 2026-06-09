import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import type { VerticalOption } from "@/lib/compliance/client-types";
import { VERTICAL_CATALOG_FALLBACK, guardrailSummaryFor } from "@/lib/compliance/vertical-catalog";
import { loadVerticalRegistry } from "@/lib/compliance/resolve-vertical-server";
import { resolveGuardrails } from "@/lib/compliance/guardrails";

/** GET /api/verticals — list assignable compliance verticals (tenant-authed). */
export async function GET() {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const registry = await loadVerticalRegistry(tx);
      if (registry.size === 0) {
        return NextResponse.json({ verticals: VERTICAL_CATALOG_FALLBACK });
      }

      const verticals: VerticalOption[] = [];
      for (const node of registry.values()) {
        const resolved = resolveGuardrails(node.slug, registry);
        verticals.push({
          slug: node.slug,
          name: node.name,
          parentSlug: node.parentSlug ?? null,
          enforcementLevel: resolved.enforcementLevel,
          regulatoryBody: resolved.regulatoryBodies[0] ?? node.regulatoryBody ?? null,
          guardrailSummary: guardrailSummaryFor(
            resolved.enforcementLevel,
            resolved.regulatoryBodies[0] ?? node.regulatoryBody ?? null,
            node.name,
          ),
        });
      }

      verticals.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ verticals });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
