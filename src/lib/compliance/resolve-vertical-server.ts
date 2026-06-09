import "server-only";

import {
  resolveGuardrails,
  type EnforcementLevel,
  type VerticalGuardrailNode,
} from "@/lib/compliance/guardrails";
import type { VerticalOption } from "@/lib/compliance/client-types";
import {
  activeGuardrailLines,
  guardrailSummaryFor,
} from "@/lib/compliance/vertical-catalog";
import type { TenantDbClient } from "@/lib/db";

const VALID_ENFORCEMENT = new Set(["block", "warn", "suggest"]);

function normalizeLevel(value: string): EnforcementLevel {
  return VALID_ENFORCEMENT.has(value) ? (value as EnforcementLevel) : "suggest";
}

export async function loadVerticalRegistry(
  tx: TenantDbClient,
): Promise<Map<string, VerticalGuardrailNode>> {
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
  const idToSlug = new Map(rows.map((r) => [r.id, r.slug]));
  const registry = new Map<string, VerticalGuardrailNode>();
  for (const r of rows) {
    registry.set(r.slug, {
      slug: r.slug,
      name: r.name,
      parentSlug: r.parentId ? idToSlug.get(r.parentId) ?? null : null,
      bannedPhrases: r.bannedPhrases,
      preferredPhrases: r.preferredPhrases,
      enforcementLevel: normalizeLevel(r.enforcementLevel),
      regulatoryBody: r.regulatoryBody,
    });
  }
  return registry;
}

export function verticalOptionFromNode(
  node: VerticalGuardrailNode,
  parentSlug: string | null,
  resolvedLevel: EnforcementLevel,
  regulatoryBodies: string[],
  bannedSample: string[],
): VerticalOption {
  const body = regulatoryBodies[0] ?? node.regulatoryBody ?? null;
  return {
    slug: node.slug,
    name: node.name,
    parentSlug,
    enforcementLevel: resolvedLevel,
    regulatoryBody: body,
    guardrailSummary: guardrailSummaryFor(resolvedLevel, body, node.name),
  };
}

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
  const node = registry.get(verticalSlug);
  if (!node) {
    return { verticalSlug, vertical: null, activeGuardrails: [] };
  }

  const resolved = resolveGuardrails(verticalSlug, registry);
  const vertical = verticalOptionFromNode(
    node,
    node.parentSlug ?? null,
    resolved.enforcementLevel,
    resolved.regulatoryBodies,
    resolved.bannedPhrases,
  );
  return {
    verticalSlug,
    vertical,
    activeGuardrails: activeGuardrailLines(
      resolved.enforcementLevel,
      vertical.regulatoryBody,
      resolved.bannedPhrases,
    ),
  };
}
