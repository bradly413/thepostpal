import "server-only";

import type { TenantDbClient } from "@/lib/db";
import { resolveGuardrails, type ResolvedGuardrails } from "@/lib/compliance/guardrails";
import { findTenantBrandBook } from "@/lib/brand-book-db";
import {
  activeGuardrailsForSlug,
  loadVerticalRegistry,
} from "@/lib/compliance/registry";
import type { VerticalOption } from "@/lib/compliance/client-types";

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

    const registry = await loadVerticalRegistry(tx);
    if (registry.size === 0 || !registry.has(verticalSlug)) return null;

    const resolved = resolveGuardrails(verticalSlug, registry);

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

/** Tenant-facing vertical assignment state for settings / onboarding APIs. */
export async function resolveTenantVertical(
  tx: TenantDbClient,
  tenantId: string,
): Promise<{
  verticalSlug: string | null;
  vertical: VerticalOption | null;
  activeGuardrails: string[];
}> {
  const org = await tx.organization.findUnique({
    where: { id: tenantId },
    select: { verticalSlug: true },
  });
  const verticalSlug = org?.verticalSlug?.trim() || null;
  if (!verticalSlug) {
    return { verticalSlug: null, vertical: null, activeGuardrails: [] };
  }

  const registry = await loadVerticalRegistry(tx);
  const state = activeGuardrailsForSlug(verticalSlug, registry);
  if (!state) {
    return { verticalSlug, vertical: null, activeGuardrails: [] };
  }

  return {
    verticalSlug,
    vertical: state.vertical,
    activeGuardrails: state.activeGuardrails,
  };
}

export { loadVerticalRegistry, verticalOptionFromNode } from "@/lib/compliance/registry";
