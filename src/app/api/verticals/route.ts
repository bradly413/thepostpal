import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import type { VerticalOption } from "@/lib/compliance/client-types";
import { VERTICAL_CATALOG_FALLBACK } from "@/lib/compliance/vertical-catalog";
import { loadVerticalRegistry } from "@/lib/compliance/resolve";
import { activeGuardrailsForSlug } from "@/lib/compliance/registry";

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
        const state = activeGuardrailsForSlug(node.slug, registry);
        if (state) verticals.push(state.vertical);
      }

      verticals.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ verticals });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
