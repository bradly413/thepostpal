import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import type { TenantDbClient } from "@/lib/db";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";
import { guardrailsPromptBlock } from "@/lib/compliance/guardrails";
import { resolveTenantGuardrails } from "@/lib/compliance/resolve";
import { fetchVoiceMemoryBlock } from "@/lib/ai-voice-memory";
import { readVoiceLearning, voiceLearningBlock } from "@/lib/ai-voice-learning";

/**
 * Compliance & brand guardrail injection (Phase 2 — prompt-injection only).
 *
 * Non-breaking by design: if the tenant has no verticalSlug, or no VerticalSeed
 * rows exist, or resolution yields nothing, this returns "" and the existing
 * brand context is unchanged. Resolution lives in compliance/resolve.ts (shared
 * with the captions post-validation in Phase 2b) and never throws — a guardrail
 * failure can never break AI generation.
 */
async function buildGuardrailBlock(tx: TenantDbClient, tenantId: string): Promise<string> {
  const resolved = await resolveTenantGuardrails(tx, tenantId);
  if (!resolved) return "";
  return guardrailsPromptBlock(resolved);
}

/**
 * Builds a per-tenant brand-voice context block from Organization.brandEngine,
 * to prepend to an AI system prompt. Returns "" (neutral) when the tenant has
 * no brand engine yet. Shared by /api/ai and /api/ai/captions so brand voice is
 * consistent across chat and multi-variant generation.
 */
export async function buildTenantBrandContext(
  auth: AuthContext,
  opts?: { platform?: string },
): Promise<string> {
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

      // Voice memory — few-shot from the tenant's recent real posts (the learning
      // loop). Empty for brand-new tenants → unchanged behavior.
      const voice = await fetchVoiceMemoryBlock(tx, auth.tenantId, org?.name ?? null, opts?.platform);

      // Learned edit patterns — what they consistently change about AI drafts.
      const learned = voiceLearningBlock(readVoiceLearning(org?.brandEngine));

      // Append compliance guardrails — graceful no-op for tenants with no vertical.
      const guardrails = await buildGuardrailBlock(tx, auth.tenantId);
      return base + voice + learned + guardrails;
    });
  } catch {
    return "";
  }
}
