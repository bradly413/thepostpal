import "server-only";

/**
 * Edit-diff learning (the sharpest voice signal).
 *
 * When a user rewrites an AI-generated caption before publishing, the diff is
 * gold — it shows exactly what the AI got wrong for *them* (too much emoji, too
 * long, too many hashtags, too much hype). We capture those diffs cheaply
 * (heuristics, no extra model call), accumulate per-tenant counters in
 * Organization.brandEngine.voiceLearning, and inject the strong, consistent
 * patterns back into generation so the AI pre-applies their edits.
 */

export interface VoiceLearning {
  edits: number;
  dropEmoji: number;
  shorten: number;
  dropHashtags: number;
  dropExclaim: number;
  dropEmDash: number;
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const count = (s: string, re: RegExp) => (s.match(re) || []).length;

export interface DiffSignals {
  changed: boolean;
  dropEmoji: boolean;
  shorten: boolean;
  dropHashtags: boolean;
  dropExclaim: boolean;
  dropEmDash: boolean;
}

/** Compare an AI-original caption to the user's edited final; return signal deltas. */
export function diffSignals(aiOriginal: string, final: string): DiffSignals {
  const a = (aiOriginal || "").trim();
  const f = (final || "").trim();
  return {
    changed: a.length > 0 && f.length > 0 && a !== f,
    dropEmoji: count(a, EMOJI_RE) > count(f, EMOJI_RE),
    dropHashtags: count(a, /#/g) > count(f, /#/g),
    dropExclaim: count(a, /!/g) > count(f, /!/g),
    dropEmDash: count(a, /—/g) > count(f, /—/g),
    shorten: f.length > 0 && f.length < a.length * 0.8,
  };
}

export function mergeLearning(prev: Partial<VoiceLearning> | undefined, sig: DiffSignals): VoiceLearning {
  const v: VoiceLearning = {
    edits: 0, dropEmoji: 0, shorten: 0, dropHashtags: 0, dropExclaim: 0, dropEmDash: 0,
    ...(prev || {}),
  };
  v.edits += 1;
  if (sig.dropEmoji) v.dropEmoji += 1;
  if (sig.shorten) v.shorten += 1;
  if (sig.dropHashtags) v.dropHashtags += 1;
  if (sig.dropExclaim) v.dropExclaim += 1;
  if (sig.dropEmDash) v.dropEmDash += 1;
  return v;
}

/** Safely read voiceLearning out of the Organization.brandEngine JSON blob. */
export function readVoiceLearning(brandEngine: unknown): Partial<VoiceLearning> | undefined {
  if (!brandEngine || typeof brandEngine !== "object") return undefined;
  const vl = (brandEngine as Record<string, unknown>).voiceLearning;
  if (!vl || typeof vl !== "object") return undefined;
  return vl as Partial<VoiceLearning>;
}

/** Emit prompt lines for signals that fire in >=2 edits AND >=40% of edits. */
export function voiceLearningBlock(v: Partial<VoiceLearning> | undefined): string {
  if (!v || !v.edits || v.edits < 2) return "";
  const total = v.edits;
  const strong = (n?: number) => (n || 0) >= 2 && (n || 0) / total >= 0.4;
  const lines: string[] = [];
  if (strong(v.dropEmoji)) lines.push("They strip emoji out of AI drafts — write with no emoji.");
  if (strong(v.shorten)) lines.push("They shorten AI drafts — keep it tight and short.");
  if (strong(v.dropHashtags)) lines.push("They cut hashtags — use very few, or none.");
  if (strong(v.dropExclaim)) lines.push("They remove exclamation marks — stay calm, no hype.");
  if (strong(v.dropEmDash)) lines.push("They remove em-dashes — use periods instead.");
  if (!lines.length) return "";
  return `\n\n## Learned from this business's own edits\nWhen this business edits AI drafts, they consistently do the following — pre-apply it so they don't have to:\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}
