import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";

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
      if (lines.length === 0) return "";
      return `\n\n## This Business's Brand\n${lines.join("\n")}\nWrite all content in this business's voice, for this niche and audience. Do NOT assume an industry that isn't stated here.`;
    });
  } catch {
    return "";
  }
}
