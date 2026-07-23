import "server-only";

import type { AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import type { TenantDbClient } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";
import { findTenantBrandBook } from "@/lib/brand-book-db";
import type { BrandBook } from "@/lib/brand-book-schema";
import { guardrailsPromptBlock } from "@/lib/compliance/guardrails";
import { resolveTenantGuardrails } from "@/lib/compliance/resolve";
import { fetchVoiceMemoryBlock } from "@/lib/ai-voice-memory";
import { readVoiceLearning, voiceLearningBlock } from "@/lib/ai-voice-learning";
import {
  readVoiceProfile,
  readImportedExemplars,
  voiceProfileBlock,
} from "@/lib/voice-engine/profile";

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
 * The onboarding-built brand book (Location.brandVoiceJson) condensed into a
 * voice block for AI system prompts. This is THE payoff of onboarding — without
 * it, the 14-step Brand Architect has zero effect on generated content.
 */
function brandBookVoiceBlock(book: BrandBook): string {
  const lines: string[] = [];
  const id = book.identity;
  if (id?.name) lines.push(`- Brand: ${id.name}${id.title ? ` — ${id.title}` : ""}`);
  if (id?.target) lines.push(`- Audience: ${id.target}`);
  const v = book.voice;
  if (v?.hero) lines.push(`- Positioning: ${v.hero}`);
  if (v?.traits?.length) lines.push(`- Voice traits: ${v.traits.map((t) => t.name).filter(Boolean).join(", ")}`);
  if (v?.weSay?.length) lines.push(`- Phrases in their voice: ${v.weSay.slice(0, 6).join(" | ")}`);
  if (v?.weDontSay?.length) lines.push(`- NEVER write: ${v.weDontSay.slice(0, 6).join(" | ")}`);
  if (v?.always) lines.push(`- Always: ${v.always}`);
  if (v?.never) lines.push(`- Never: ${v.never}`);
  if (book.pillars?.length) {
    lines.push(`- Content pillars: ${book.pillars.map((p) => p.name).filter(Boolean).slice(0, 5).join(", ")}`);
  }
  if (lines.length === 0) return "";
  return `\n\n## Brand Book (write in THIS voice)\n${lines.join("\n")}`;
}

/**
 * Builds a per-tenant brand-voice context block from the location brand book
 * (Location.brandVoiceJson — the onboarding output) plus the legacy
 * Organization.brandEngine DNA, to prepend to an AI system prompt. Returns ""
 * (neutral) when the tenant has neither. Shared by /api/ai and /api/ai/captions
 * so brand voice is consistent across chat and multi-variant generation.
 */
export async function buildTenantBrandContext(
  auth: AuthContext,
  opts?: { platform?: string; locationId?: string | null },
): Promise<string> {
  try {
    return await withTenantDb(auth, async (tx) => {
      if (opts?.locationId) {
        const access = await resolveAccess(auth.userId, opts.locationId, tx);
        if (!access.hasAccess) return "";
      }
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

      // Voice Engine: a profile extracted from the tenant's REAL captions is
      // the source of truth. Only tenants without one fall back to the legacy
      // onboarding brand book.
      const profile = readVoiceProfile(org?.brandEngine);
      let bookBlock = "";
      if (profile) {
        bookBlock = voiceProfileBlock(profile);
      } else {
        const found = await findTenantBrandBook(tx, auth.tenantId, opts?.locationId ?? null);
        bookBlock = found.brandBook ? brandBookVoiceBlock(found.brandBook) : "";
      }

      const base =
        lines.length === 0 && !bookBlock
          ? ""
          : `\n\n## This Business's Brand\n${lines.join("\n")}${bookBlock}\nWrite all content in this business's voice, for this niche and audience. Do NOT assume an industry that isn't stated here.`;

      // Voice memory — few-shot from the tenant's recent real posts (the learning
      // loop), seeded with imported exemplars (pasted at onboarding / pulled from
      // Meta history) so even day-one tenants are grounded in real writing.
      const imported = readImportedExemplars(org?.brandEngine);
      const voice = await fetchVoiceMemoryBlock(tx, auth.tenantId, org?.name ?? null, opts?.platform, {
        importedExemplars: imported.map((e) => e.copy),
      });

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

/**
 * Compact VISUAL brand direction for image generation (the art-director step):
 * photography style + palette accents + audience from the location brand book.
 * Returns "" when the tenant has no brand book — generation proceeds unbranded.
 */
export async function buildTenantImageBrandContext(
  auth: AuthContext,
  opts?: { locationId?: string | null },
): Promise<string> {
  try {
    return await withTenantDb(auth, async (tx) => {
      if (opts?.locationId) {
        const access = await resolveAccess(auth.userId, opts.locationId, tx);
        if (!access.hasAccess) return "";
      }
      const found = await findTenantBrandBook(tx, auth.tenantId, opts?.locationId ?? null);
      const book = found.brandBook;
      if (!book) return "";
      const lines: string[] = [];
      if (book.photography?.description) {
        lines.push(`Photography style: ${book.photography.description}`);
      }
      const principles = book.photography?.principles
        ?.map((p) => p.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      if (principles) lines.push(`Photo principles: ${principles}`);
      const ink = book.palette?.ink?.hex;
      const signal = book.palette?.signal?.hex;
      if (ink || signal) {
        lines.push(
          `Brand palette accents: ${[ink, signal].filter(Boolean).join(", ")} — let these influence props/wardrobe/accent details naturally; do NOT tint the whole scene.`,
        );
      }
      if (book.identity?.target) lines.push(`Audience: ${book.identity.target}`);
      return lines.join("\n");
    });
  } catch {
    return "";
  }
}
