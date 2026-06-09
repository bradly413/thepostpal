import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import type { TenantDbClient } from "@/lib/db";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";
import {
  guardrailsPromptBlock,
  resolveGuardrails,
  type EnforcementLevel,
  type VerticalGuardrailNode,
} from "@/lib/compliance/guardrails";
import { findTenantBrandBook } from "@/lib/brand-book-db";

const VALID_ENFORCEMENT: ReadonlySet<string> = new Set(["block", "warn", "suggest"]);

function normalizeEnforcement(value: string): EnforcementLevel {
  return VALID_ENFORCEMENT.has(value) ? (value as EnforcementLevel) : "suggest";
}

/**
 * Compliance & brand guardrail injection (Phase 2 — prompt-injection only).
 *
 * Non-breaking by design: if the tenant has no verticalSlug, or no VerticalSeed
 * rows exist, or resolution yields nothing, this returns "" and the existing
 * brand context is unchanged. Wrapped in try/catch so a guardrail failure can
 * never break AI generation. No post-validation here (that is Phase 2b).
 */
async function buildGuardrailBlock(tx: TenantDbClient, tenantId: string): Promise<string> {
  try {
    const org = await tx.organization.findUnique({
      where: { id: tenantId },
      select: { verticalSlug: true },
    });
    const verticalSlug = org?.verticalSlug?.trim();
    if (!verticalSlug) return "";

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
    if (rows.length === 0) return "";

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

    if (!registry.has(verticalSlug)) return "";

    const resolved = resolveGuardrails(verticalSlug, registry);

    // Merge the tenant's own brand-book phrases (if readily available) into the
    // resolved set so per-tenant voice guardrails ride alongside the vertical's.
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

    return guardrailsPromptBlock(resolved);
  } catch {
    return "";
  }
}

/**
 * Builds a per-tenant brand-voice context block from Organization.brandEngine,
 * to prepend to an AI system prompt. Returns "" (neutral) when the tenant has
 * no brand engine yet. Shared by /api/ai and /api/ai/captions so brand voice is
 * consistent across chat and multi-variant generation.
 */
export async function buildTenantBrandContext(auth: AuthContext): Promise<string> {
  try {
    return await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true, name: true, businessType: true },
      });
      const dna = readBrandEngineImageContext(org?.brandEngine);
      const lines: string[] = [];
      if (org?.name) {
        lines.push(`- Business: ${org.name}${org.businessType ? ` (${org.businessType})` : ""}`);
      }
      if (dna?.niche) lines.push(`- Niche / focus: ${dna.niche}`);
      if (dna?.primaryTone) lines.push(`- Voice & tone: ${dna.primaryTone}`);
      if (dna?.contrastVibe) lines.push(`- Visual vibe: ${dna.contrastVibe}`);

      const base =
        lines.length === 0
          ? ""
          : `\n\n## This Business's Brand\n${lines.join("\n")}\nWrite all content in this business's voice, for this niche and audience. Do NOT assume an industry that isn't stated here.`;

      // Append compliance guardrails — graceful no-op for tenants with no vertical.
      const guardrails = await buildGuardrailBlock(tx, auth.tenantId);
      return base + guardrails;
    });
  } catch {
    return "";
  }
}
