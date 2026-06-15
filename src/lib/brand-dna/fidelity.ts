import "server-only";

import type { TenantDbClient } from "@/lib/db";
import { loadBrandDnaFingerprint } from "@/lib/brand-dna/persist";
import { scoreVoiceFidelity, type FidelityResult } from "@/lib/brand-dna/voice-fingerprint";

// ─────────────────────────────────────────────────────────────
//  Brand DNA — voice-fidelity gate
//
//  Scores a piece of text against the location's PERSISTED voice fingerprint
//  ("does this sound like them?"). The deterministic primitive lives in
//  voice-fingerprint.ts (unit-tested); this loads the stored fingerprint and
//  applies it. Generation flows call this to flag/regenerate off-voice copy;
//  it's also exposed as POST /api/brand-dna/fidelity.
// ─────────────────────────────────────────────────────────────

export interface StoredFidelity extends FidelityResult {
  /** How many captions backed the stored fingerprint (confidence signal). */
  sampleCount: number;
}

/**
 * Score `text` against the location's stored voice fingerprint. Returns null
 * when no Brand DNA has been analyzed for the location yet (caller treats that
 * as "no opinion" rather than a low score). Caller must be tenant-scoped
 * (withTenantDb) and access-checked.
 */
export async function scoreStoredVoiceFidelity(
  tx: TenantDbClient,
  locationId: string,
  text: string,
): Promise<StoredFidelity | null> {
  const fingerprint = await loadBrandDnaFingerprint(tx, locationId);
  if (!fingerprint || fingerprint.sampleCount === 0) return null;
  return { ...scoreVoiceFidelity(text, fingerprint), sampleCount: fingerprint.sampleCount };
}
