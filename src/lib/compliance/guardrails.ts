import "server-only";

/**
 * Compliance & brand guardrail engine.
 *
 * Pure, dependency-free functions that resolve a tenant's effective guardrails
 * from a Parent-Child vertical registry, inject them into an AI system prompt,
 * and post-validate generated output. Wired into the live AI routes:
 * /api/ai (chat), /api/ai/captions, and /api/studio/elevate all resolve
 * guardrails per-tenant (best-effort, null = no vertical → no enforcement) and
 * post-validate output with checkViolations. See docs/COMPLIANCE-ENGINE-DESIGN.md.
 *
 * Decoupled from Prisma on purpose: operates on plain nodes so it can be unit
 * tested independently of the VerticalSeed model.
 */

export type EnforcementLevel = "block" | "warn" | "suggest";

/** One node in the parent-child vertical tree (mirrors the proposed VerticalSeed). */
export interface VerticalGuardrailNode {
  slug: string;
  name: string;
  parentSlug?: string | null;
  bannedPhrases: string[]; // weDontSay
  preferredPhrases: string[]; // weSay
  enforcementLevel: EnforcementLevel;
  regulatoryBody?: string | null;
}

/** Effective guardrails after walking the leaf vertical up its parent chain. */
export interface ResolvedGuardrails {
  bannedPhrases: string[]; // union along the whole chain
  preferredPhrases: string[]; // leaf vocabulary
  enforcementLevel: EnforcementLevel; // strictest along the chain
  regulatoryBodies: string[];
}

const LEVEL_RANK: Record<EnforcementLevel, number> = { suggest: 0, warn: 1, block: 2 };

/**
 * Resolve a leaf vertical to its effective guardrails: union banned phrases up the
 * parent chain, keep the leaf's preferred vocabulary, take the strictest enforcement.
 * Cycle-safe.
 */
export function resolveGuardrails(
  leafSlug: string,
  registry: Map<string, VerticalGuardrailNode>,
): ResolvedGuardrails {
  const banned = new Set<string>();
  const bodies = new Set<string>();
  const seen = new Set<string>();
  let level: EnforcementLevel = "suggest";
  let preferred: string[] = [];

  let cur = registry.get(leafSlug);
  let isLeaf = true;
  while (cur && !seen.has(cur.slug)) {
    seen.add(cur.slug);
    for (const p of cur.bannedPhrases) banned.add(p);
    if (cur.regulatoryBody) bodies.add(cur.regulatoryBody);
    if (LEVEL_RANK[cur.enforcementLevel] > LEVEL_RANK[level]) level = cur.enforcementLevel;
    if (isLeaf) {
      preferred = [...cur.preferredPhrases];
      isLeaf = false;
    }
    cur = cur.parentSlug ? registry.get(cur.parentSlug) : undefined;
  }

  return {
    bannedPhrases: [...banned],
    preferredPhrases: preferred,
    enforcementLevel: level,
    regulatoryBodies: [...bodies],
  };
}

/** Build the system-prompt injection from resolved guardrails (empty string when none). */
export function guardrailsPromptBlock(g: ResolvedGuardrails): string {
  if (!g.bannedPhrases.length && !g.preferredPhrases.length) return "";
  const lines: string[] = ["\n\n## Compliance & Brand Guardrails"];
  if (g.bannedPhrases.length) {
    const verb = g.enforcementLevel === "block" ? "NEVER use" : "Avoid";
    const body = g.regulatoryBodies.length ? ` (${g.regulatoryBodies.join(", ")})` : "";
    lines.push(`${verb} these phrases or claims${body}:`);
    lines.push(g.bannedPhrases.map((p) => `- "${p}"`).join("\n"));
  }
  if (g.preferredPhrases.length) {
    lines.push("Prefer this on-brand vocabulary where natural:");
    lines.push(g.preferredPhrases.map((p) => `- "${p}"`).join("\n"));
  }
  if (g.enforcementLevel === "block") {
    lines.push(
      "These are non-negotiable regulatory constraints. If the request would require a restricted claim, refuse and explain rather than producing it.",
    );
  }
  return lines.join("\n");
}

export interface GuardrailViolation {
  phrase: string;
  index: number;
}

/**
 * Scan generated text for banned phrases (case-insensitive). Uses a word-ish boundary
 * so "cure" doesn't match "manicure" / "secure".
 */
export function checkViolations(text: string, g: ResolvedGuardrails): GuardrailViolation[] {
  const out: GuardrailViolation[] = [];
  for (const phrase of g.bannedPhrases) {
    const needle = phrase.trim();
    if (!needle) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`, "giu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ phrase, index: m.index });
      if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-width loop
    }
  }
  return out;
}

export type EnforcementAction = "pass" | "warn" | "regenerate" | "block";

/** Decide what the AI pipeline should do given violations + the resolved enforcement level. */
export function enforcementDecision(
  violations: GuardrailViolation[],
  level: EnforcementLevel,
): { action: EnforcementAction; flaggedPhrases: string[]; message?: string } {
  if (violations.length === 0) return { action: "pass", flaggedPhrases: [] };
  const flaggedPhrases = [...new Set(violations.map((v) => v.phrase))];
  if (level === "block") {
    return {
      action: "regenerate",
      flaggedPhrases,
      message: `Output contained restricted phrasing (${flaggedPhrases.join(", ")}). Regenerating within compliance — escalate to review if it recurs.`,
    };
  }
  // warn + suggest both surface a non-blocking flag.
  return {
    action: "warn",
    flaggedPhrases,
    message: `Heads up — this may need a second look: ${flaggedPhrases.join(", ")}.`,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
