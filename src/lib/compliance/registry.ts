import "server-only";

import type { TenantDbClient } from "@/lib/db";
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

const VALID_ENFORCEMENT = new Set(["block", "warn", "suggest"]);

/** Normalize a DB/registry enforcement string to a known level. */
export function normalizeEnforcementLevel(value: string): EnforcementLevel {
  return VALID_ENFORCEMENT.has(value) ? (value as EnforcementLevel) : "suggest";
}

/** Load the full VerticalSeed registry as guardrail nodes keyed by slug. */
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
      enforcementLevel: normalizeEnforcementLevel(r.enforcementLevel),
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

export function activeGuardrailsForSlug(
  verticalSlug: string,
  registry: Map<string, VerticalGuardrailNode>,
): {
  vertical: VerticalOption;
  activeGuardrails: string[];
} | null {
  const node = registry.get(verticalSlug);
  if (!node) return null;

  const resolved = resolveGuardrails(verticalSlug, registry);
  const vertical = verticalOptionFromNode(
    node,
    node.parentSlug ?? null,
    resolved.enforcementLevel,
    resolved.regulatoryBodies,
    resolved.bannedPhrases,
  );
  return {
    vertical,
    activeGuardrails: activeGuardrailLines(
      resolved.enforcementLevel,
      vertical.regulatoryBody,
      resolved.bannedPhrases,
    ),
  };
}
