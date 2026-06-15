import "server-only";

import type { TenantDbClient } from "@/lib/db";
import type { ZeroShotExtraction } from "@/lib/zero-shot-extraction";
import type { PaletteColor } from "@/lib/brand-dna/palette";

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

/**
 * Persist the Brand DNA for a location. Best-effort and conditional: upserts
 * BrandKit colors only when a palette exists, and BrandVoiceProfile only when an
 * AI voice was inferred. Caller must already be tenant-scoped (withTenantDb) and
 * access-checked.
 */
export async function persistBrandDna(
  tx: TenantDbClient,
  locationId: string,
  input: { voice: ZeroShotExtraction | null; palette: PaletteColor[] },
): Promise<void> {
  const colors = paletteToBrandColors(input.palette);
  if (colors.primaryColor) {
    await tx.brandKit.upsert({
      where: { locationId },
      create: { locationId, primaryColor: colors.primaryColor, secondaryColor: colors.secondaryColor },
      update: { primaryColor: colors.primaryColor, secondaryColor: colors.secondaryColor ?? undefined },
    });
  }

  if (input.voice) {
    const f = voiceProfileFields(input.voice);
    await tx.brandVoiceProfile.upsert({
      where: { locationId },
      create: { locationId, ...f },
      update: f,
    });
  }
}
