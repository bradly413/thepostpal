import "server-only";

import { generateObject } from "ai";
import { anthropic } from "@/lib/ai/anthropic";
import {
  voiceProfileSchema,
  normalizeVoiceProfile,
  type VoiceProfile,
} from "@/lib/voice-engine/profile";

/**
 * Extract a VoiceProfile from the user's REAL captions. Evidence-only: the
 * model describes what is actually there, never invents brand personality.
 * Minimum 3 captions — below that, extraction overfits noise.
 */

export const MIN_CAPTIONS_FOR_EXTRACTION = 3;
export const MAX_CAPTIONS_FOR_EXTRACTION = 50;

const SYSTEM = `You are a forensic writing analyst. You will receive real social media captions written by (or for) one local business. Your job is to describe EXACTLY how this author writes, so another writer could produce posts indistinguishable from theirs.

Rules:
- Evidence only. Every field must be justified by the captions. If a habit isn't present, say "not observed" style facts (e.g. emojiPolicy: "never uses emoji").
- Quote signaturePhrases VERBATIM from the captions — never invent or improve them.
- Notice the unglamorous details: casing, punctuation, sentence fragments, how they open, how they close, whether they name prices, how they address the reader.
- Do not editorialize about whether the writing is good. Describe it.
- neverSay: only include things clearly avoided given the register (e.g. corporate jargon for a casual writer) — keep it short; user-declared bans are merged separately.`;

export async function extractVoiceProfile(
  captions: string[],
  opts?: { businessName?: string; niche?: string; userBans?: string[] },
): Promise<VoiceProfile> {
  const cleaned = captions
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_CAPTIONS_FOR_EXTRACTION);
  if (cleaned.length < MIN_CAPTIONS_FOR_EXTRACTION) {
    throw new Error(`Need at least ${MIN_CAPTIONS_FOR_EXTRACTION} captions to extract a voice.`);
  }

  const header = [
    opts?.businessName ? `Business: ${opts.businessName}` : null,
    opts?.niche ? `What they do: ${opts.niche}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: voiceProfileSchema,
    system: SYSTEM,
    prompt: `${header ? header + "\n\n" : ""}Their real captions (${cleaned.length}):\n\n${cleaned
      .map((c, i) => `--- Caption ${i + 1} ---\n${c}`)
      .join("\n\n")}`,
  });

  // Merge user-declared bans into neverSay (user bans always win, deduped),
  // then clamp everything to storage-safe sizes.
  const bans = (opts?.userBans ?? []).map((b) => b.trim()).filter(Boolean);
  const merged = [...new Set([...bans, ...object.neverSay])];
  return normalizeVoiceProfile({ ...object, neverSay: merged });
}
