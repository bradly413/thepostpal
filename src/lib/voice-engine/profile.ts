import { z } from "zod";

/**
 * VoiceProfile — the structured representation of how a business actually
 * writes, extracted by AI from their real captions (or, for users with no
 * posts yet, assembled from their own typed answers — never from presets).
 *
 * This replaces the fabricated brand-book voice as the generation-time
 * source of truth. Stored in Organization.brandEngine JSON under
 * `voiceProfile` — no schema migration required.
 */

// Generation-side schema stays permissive — hard caps on model output make
// generateObject brittle. normalizeVoiceProfile() clamps before storage.
export const voiceProfileSchema = z.object({
  /** One plain sentence describing the overall voice, in second person. */
  summary: z.string(),
  /** e.g. "casual", "dry", "warm", "polished" — free text, from evidence. */
  register: z.string(),
  /** Typical sentence/caption length habits, described concretely. */
  lengthHabits: z.string(),
  /** Emoji policy observed: which, where, how many — or "never". */
  emojiPolicy: z.string(),
  /** Hashtag policy observed: count, casing, placement — or "never". */
  hashtagPolicy: z.string(),
  /** Capitalization + punctuation quirks (lowercase i, no periods, "!", "—"). */
  punctuationQuirks: z.string(),
  /** How they ask for action (soft nudge, direct, never) with a real example. */
  ctaStyle: z.string(),
  /** Verbatim phrases that recur — their fingerprint. */
  signaturePhrases: z.array(z.string()),
  /** Words/phrases they never use (user-declared bans merged in). */
  neverSay: z.array(z.string()),
  /** What they actually post about, concretely. */
  topics: z.array(z.string()),
  /** How they talk about money/offers, if evidenced. */
  offerStyle: z.string().optional(),
});

export type VoiceProfile = z.infer<typeof voiceProfileSchema>;

/** Clamp a model-produced profile to storage-safe sizes. */
export function normalizeVoiceProfile(p: VoiceProfile): VoiceProfile {
  const s = (v: string, max: number) => v.trim().slice(0, max);
  const arr = (v: string[], maxItems: number, maxLen: number) =>
    v.map((x) => x.trim()).filter(Boolean).slice(0, maxItems).map((x) => x.slice(0, maxLen));
  return {
    summary: s(p.summary, 300),
    register: s(p.register, 80),
    lengthHabits: s(p.lengthHabits, 200),
    emojiPolicy: s(p.emojiPolicy, 200),
    hashtagPolicy: s(p.hashtagPolicy, 200),
    punctuationQuirks: s(p.punctuationQuirks, 200),
    ctaStyle: s(p.ctaStyle, 200),
    signaturePhrases: arr(p.signaturePhrases, 8, 120),
    neverSay: arr(p.neverSay, 12, 120),
    topics: arr(p.topics, 8, 80),
    ...(p.offerStyle?.trim() ? { offerStyle: s(p.offerStyle, 200) } : {}),
  };
}

/** Loose read from stored JSON — returns null rather than throwing. */
export function readVoiceProfile(raw: unknown): VoiceProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = voiceProfileSchema.safeParse(
    (raw as Record<string, unknown>).voiceProfile ?? raw,
  );
  return parsed.success ? parsed.data : null;
}

/**
 * Render the profile as a prompt block. Deliberately imperative and concrete —
 * these are writing constraints, not brand poetry.
 */
export function voiceProfileBlock(profile: VoiceProfile): string {
  const lines: string[] = [
    `- Voice: ${profile.summary}`,
    `- Register: ${profile.register}`,
    `- Length: ${profile.lengthHabits}`,
    `- Emoji: ${profile.emojiPolicy}`,
    `- Hashtags: ${profile.hashtagPolicy}`,
    `- Punctuation/casing: ${profile.punctuationQuirks}`,
    `- Calls to action: ${profile.ctaStyle}`,
  ];
  if (profile.offerStyle) lines.push(`- Talking about offers/price: ${profile.offerStyle}`);
  if (profile.signaturePhrases.length > 0) {
    lines.push(`- Phrases in their fingerprint (reuse sparingly, never all at once): ${profile.signaturePhrases.join(" | ")}`);
  }
  if (profile.topics.length > 0) lines.push(`- They post about: ${profile.topics.join(", ")}`);
  if (profile.neverSay.length > 0) {
    lines.push(`- HARD BANS — never write these words/phrases: ${profile.neverSay.join(" | ")}`);
  }
  return `\n\n## How this business actually writes (match it exactly)\n${lines.join("\n")}`;
}

/** Imported exemplar captions (pasted at onboarding or pulled from history). */
export interface ImportedExemplar {
  copy: string;
  source: "pasted" | "meta-history";
}

const MAX_EXEMPLARS = 12;
const MAX_EXEMPLAR_LENGTH = 600;

export function readImportedExemplars(raw: unknown): ImportedExemplar[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as Record<string, unknown>).importedExemplars;
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (e): e is ImportedExemplar =>
        !!e &&
        typeof e === "object" &&
        typeof (e as ImportedExemplar).copy === "string" &&
        (e as ImportedExemplar).copy.trim().length > 0,
    )
    .slice(0, MAX_EXEMPLARS);
}

/** Sanitize + cap captions for storage as exemplars. */
export function toImportedExemplars(
  captions: string[],
  source: ImportedExemplar["source"],
): ImportedExemplar[] {
  return captions
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_EXEMPLARS)
    .map((copy) => ({ copy: copy.slice(0, MAX_EXEMPLAR_LENGTH), source }));
}
