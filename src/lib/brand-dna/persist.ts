import "server-only";

import { Prisma } from "@prisma/client";
import type { TenantDbClient } from "@/lib/db";
import type { ZeroShotExtraction } from "@/lib/zero-shot-extraction";
import type { PaletteColor } from "@/lib/brand-dna/palette";
import type { VoiceFingerprint } from "@/lib/brand-dna/voice-fingerprint";
import type { VisualSemantics } from "@/lib/brand-dna/semantic-enrichment";

// ─────────────────────────────────────────────────────────────
//  Brand DNA — persistence
//
//  Maps the analyzed Brand DNA onto the EXISTING normalized tables (no migration):
//   • BrandVoiceProfile ← the AI voice enrichment (tone / we-say / we-don't-say /
//     pillars) — what compliance + generation read.
//   • BrandKit ← the top palette colors (primary / secondary).
//
//  Conditional by design: only writes a table when we actually have that data, so
//  a palette-only or voice-only analysis never wipes the other.
//
//  Follow-up (needs a migration): persist the FULL palette array, the deterministic
//  voice fingerprint, and the visual semantics (subjects/composition/mood).
// ─────────────────────────────────────────────────────────────

export interface VoiceProfileFields {
  tone: string[];
  preferredPhrases: string[];
  bannedPhrases: string[];
  recurringThemes: string[];
}

/** Map the zero-shot voice extraction onto BrandVoiceProfile columns (pure). */
export function voiceProfileFields(voice: ZeroShotExtraction): VoiceProfileFields {
  return {
    // tone is a sentence-y string ("Warm. Local. Honest.") → split into labels.
    tone: voice.tone
      .split(/[.•\n]/)
      .map((t) => t.trim())
      .filter(Boolean),
    preferredPhrases: voice.weSay ?? [],
    bannedPhrases: voice.weDontSay ?? [],
    recurringThemes: voice.pillars ?? [],
  };
}

/** Map the aggregated palette onto BrandKit's two color slots (pure). */
export function paletteToBrandColors(palette: PaletteColor[]): {
  primaryColor: string | null;
  secondaryColor: string | null;
} {
  return {
    primaryColor: palette[0]?.hex ?? null,
    secondaryColor: palette[1]?.hex ?? null,
  };
}

export interface PersistBrandDnaInput {
  /** AI voice extraction (tone/we-say/etc.) — null when enrichment didn't run. */
  voice: ZeroShotExtraction | null;
  /** Deterministic voice fingerprint (always present). */
  fingerprint: VoiceFingerprint;
  /** Aggregated brand palette (may be empty when no images were analyzed). */
  palette: PaletteColor[];
  /** AI visual semantics — null when not analyzed. */
  visual: VisualSemantics | null;
}

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

/**
 * Persist the Brand DNA for a location. Best-effort and conditional so a partial
 * analysis never wipes existing data:
 *  • BrandKit colors — only when a palette exists.
 *  • BrandVoiceProfile normalized voice fields — only when an AI voice was inferred.
 *  • Rich JSON (fingerprint always; palette/visualIdentity only when present).
 * Caller must already be tenant-scoped (withTenantDb) and access-checked.
 */
export async function persistBrandDna(
  tx: TenantDbClient,
  locationId: string,
  input: PersistBrandDnaInput,
): Promise<void> {
  const colors = paletteToBrandColors(input.palette);
  if (colors.primaryColor) {
    await tx.brandKit.upsert({
      where: { locationId },
      create: { locationId, primaryColor: colors.primaryColor, secondaryColor: colors.secondaryColor },
      update: { primaryColor: colors.primaryColor, secondaryColor: colors.secondaryColor ?? undefined },
    });
  }

  // Rich fields freshly computed this run — always written. Conditionals avoid
  // overwriting prior data we don't have this time (voice, visual).
  const data: Prisma.BrandVoiceProfileUncheckedUpdateInput = {
    voiceFingerprint: asJson(input.fingerprint),
  };
  if (input.palette.length > 0) data.palette = asJson(input.palette);
  if (input.visual) data.visualIdentity = asJson(input.visual);
  if (input.voice) Object.assign(data, voiceProfileFields(input.voice));

  await tx.brandVoiceProfile.upsert({
    where: { locationId },
    create: Object.assign({ locationId }, data) as Prisma.BrandVoiceProfileUncheckedCreateInput,
    update: data,
  });
}

/**
 * Load the persisted deterministic voice fingerprint for a location, if any.
 * Unblocks the voice-fidelity gate (score generated copy against the user's
 * measured style). Returns null when no Brand DNA has been analyzed yet.
 */
export async function loadBrandDnaFingerprint(
  tx: TenantDbClient,
  locationId: string,
): Promise<VoiceFingerprint | null> {
  const row = await tx.brandVoiceProfile.findUnique({
    where: { locationId },
    select: { voiceFingerprint: true },
  });
  return (row?.voiceFingerprint as VoiceFingerprint | null) ?? null;
}
