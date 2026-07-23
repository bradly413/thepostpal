import "server-only";

import type { TenantDbClient } from "@/lib/db";

/**
 * Voice memory — the learning loop (Tier 1, v1).
 *
 * The AI is otherwise stateless: every caption is a fresh zero-shot generation.
 * This grounds generation in how the business *actually* posts by injecting their
 * recent real captions as few-shot examples. The signal compounds: pick → (edit)
 * → publish → Post.copy → the next generation learns from it.
 *
 * Quality gate: we skip example captions that themselves read as AI slop, so the
 * loop reinforces human voice rather than amplifying old machine-sounding posts.
 * Returns "" (neutral) when there isn't enough signal yet — brand-new tenants are
 * unchanged.
 */

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const SLOP_PHRASE_RE =
  /\b(we said what we said|pull up a (?:chair|stool)|look no further|your new favorite|the perfect|elevate your|unleash|game-?changer|say goodbye to|dive in|level up)\b/i;

/** Cheap heuristic: does this caption read like a human wrote it (vs AI slop)? */
function looksHuman(text: string): boolean {
  const emoji = (text.match(EMOJI_RE) || []).length;
  const emDashes = (text.match(/—/g) || []).length;
  const hashtags = (text.match(/#/g) || []).length;
  const exclaims = (text.match(/!/g) || []).length;
  if (emoji > 1) return false; // emoji garnish
  if (emDashes > 1) return false; // em-dash crutch
  if (hashtags > 6) return false; // hashtag stuffing
  if (exclaims > 2) return false; // hype
  if (SLOP_PHRASE_RE.test(text)) return false;
  return true;
}

/**
 * Build a few-shot "how this business actually writes" block from their recent
 * real posts. Tenant-scoped both by RLS (withTenantDb) AND an explicit
 * location→org filter for defense-in-depth.
 */
export async function fetchVoiceMemoryBlock(
  tx: TenantDbClient,
  tenantId: string,
  businessName: string | null,
  platform?: string,
  opts?: {
    /**
     * Voice Engine: captions the user pasted at onboarding (or pulled from
     * their Meta history). Real writing — used to ground BRAND-NEW tenants
     * before they've published anything through the app. Committed in-app
     * posts still lead once they exist.
     */
    importedExemplars?: string[];
  },
): Promise<string> {
  let posts: { copy: string; platforms: string[]; imported?: boolean }[] = [];
  try {
    // ScheduledPost is the canonical post store. Prefer COMMITTED captions
    // (published / scheduled / approved) — those are real voice the user stood
    // behind, not throwaway drafts. Scoped by organizationId (+ RLS).
    posts = await tx.scheduledPost.findMany({
      where: {
        organizationId: tenantId,
        status: { in: ["published", "scheduled", "approved"] },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { copy: true, platforms: true },
    });
  } catch {
    return "";
  }

  // Imported exemplars ride behind committed posts: real voice either way,
  // but what they published through the app is the freshest signal. They are
  // EXEMPT from the slop gate — if the owner's real style is emoji-heavy,
  // that IS the voice; the gate only guards against AI-slop feedback loops.
  for (const copy of opts?.importedExemplars ?? []) {
    posts.push({ copy, platforms: [], imported: true });
  }

  // Platform-aware: same-platform posts teach that platform's voice. Keep them
  // first, then fall back to other platforms so we always have enough signal.
  if (platform) {
    posts = [
      ...posts.filter((p) => (p.platforms || []).includes(platform)),
      ...posts.filter((p) => !(p.platforms || []).includes(platform)),
    ];
  }

  const seen = new Set<string>();
  const examples: string[] = [];
  for (const p of posts) {
    const copy = (p.copy || "").replace(/\s+/g, " ").trim();
    if (copy.length < 12 || copy.length > 600) continue;
    const key = copy.slice(0, 48).toLowerCase();
    if (seen.has(key)) continue; // dedupe near-identical reposts
    if (!p.imported && !looksHuman(copy)) continue;
    seen.add(key);
    examples.push(copy);
    if (examples.length >= 6) break;
  }

  if (examples.length < 2) return ""; // not enough signal yet — stay neutral

  const who = businessName?.trim() || "this business";
  return `\n\n## How ${who} actually writes (recent real posts)\nThese are real captions ${who} has published. Match this voice, rhythm, and typical length. Learn the patterns — do NOT reuse these exact phrases:\n${examples
    .map((e) => `- "${e}"`)
    .join("\n")}`;
}
