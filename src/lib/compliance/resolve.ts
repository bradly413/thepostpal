import "server-only";

import type { TenantDbClient } from "@/lib/db";
import {
  resolveGuardrails,
  type EnforcementLevel,
  type ResolvedGuardrails,
  type VerticalGuardrailNode,
} from "@/lib/compliance/guardrails";
import { findTenantBrandBook } from "@/lib/brand-book-db";

const VALID_ENFORCEMENT: ReadonlySet<string> = new Set(["block", "warn", "suggest"]);

function normalizeEnforcement(value: string): EnforcementLevel {
  return VALID_ENFORCEMENT.has(value) ? (value as EnforcementLevel) : "suggest";
}

/**
 * Resolve a tenant's effective compliance guardrails.
 *
 * Walks the tenant's leaf VerticalSeed up its parent chain (union banned phrases,
 * strictest enforcement, leaf preferred vocabulary) and then merges the tenant's
 * own brand-book weDontSay / weSay so per-tenant voice rules ride alongside the
 * vertical's regulatory ones.
 *
 * Returns `null` — the non-breaking signal — when the tenant has no verticalSlug,
 * when there are no VerticalSeed rows, or when the slug isn't found in the registry.
 * Callers MUST treat `null` as "behave exactly as before (no compliance)".
 *
 * Best-effort by design: never throws. Any unexpected failure resolves to `null`
 * so guardrail resolution can never break the calling AI pipeline.
 */
export async function resolveTenantGuardrails(
  tx: TenantDbClient,
  tenantId: string,
): Promise<ResolvedGuardrails | null> {
  try {
    const org = await tx.organization.findUnique({
      where: { id: tenantId },
      select: { verticalSlug: true },
    });
    const verticalSlug = org?.verticalSlug?.trim();
    if (!verticalSlug) return null;

    const rows = await tx.verticalSeed.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
        bannedPhrases: true,
        preferredPhrases: true,
        enforcementLevel: true,
        regulatoryBody: true,
      },
    });
    if (rows.length === 0) return null;

    // id -> slug, so we can map each node's parentId to a parentSlug.
    const idToSlug = new Map<string, string>();
    for (const r of rows) idToSlug.set(r.id, r.slug);

    const registry = new Map<string, VerticalGuardrailNode>();
    for (const r of rows) {
      registry.set(r.slug, {
        slug: r.slug,
        name: r.name,
        parentSlug: r.parentId ? idToSlug.get(r.parentId) ?? null : null,
        bannedPhrases: r.bannedPhrases,
        preferredPhrases: r.preferredPhrases,
        enforcementLevel: normalizeEnforcement(r.enforcementLevel),
        regulatoryBody: r.regulatoryBody,
      });
    }

    if (!registry.has(verticalSlug)) return null;

    const resolved = resolveGuardrails(verticalSlug, registry);

    // Merge the tenant's own brand-book phrases (best-effort) so per-tenant voice
    // guardrails ride alongside the vertical's regulatory ones.
    try {
      const { brandBook } = await findTenantBrandBook(tx, tenantId);
      const ownBanned = brandBook?.voice?.weDontSay ?? [];
      const ownPreferred = brandBook?.voice?.weSay ?? [];
      if (ownBanned.length) {
        resolved.bannedPhrases = [...new Set([...resolved.bannedPhrases, ...ownBanned])];
      }
      if (ownPreferred.length) {
        resolved.preferredPhrases = [
          ...new Set([...resolved.preferredPhrases, ...ownPreferred]),
        ];
      }
    } catch {
      // Brand-book merge is best-effort; resolved vertical guardrails still apply.
    }

    return resolved;
  } catch {
    return null;
  }
}
