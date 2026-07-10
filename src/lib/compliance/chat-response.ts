import type { ResolvedGuardrails } from "@/lib/compliance/guardrails";
import { checkViolations } from "@/lib/compliance/guardrails";

/**
 * The JSON body returned by POST /api/ai. Preserves the legacy `{ message }`
 * shape byte-for-byte when there are no guardrails or no violations, so existing
 * chat clients are unaffected.
 */
export interface ChatPayload {
  message: string;
  compliance?:
    | {
        blocked: true;
        level: "block";
        flaggedPhrases: string[];
        message: string;
      }
    | {
        level: "warn" | "suggest";
        flaggedPhrases: string[];
      };
}

/**
 * Post-validate generated chat text against the tenant's compliance guardrails
 * and shape the response body.
 *
 * - No guardrails / no violations → `{ message: text }` (unchanged behavior).
 * - `block`-level violation → withhold the text, return an explicit compliance
 *   payload the client can surface.
 * - `warn` / `suggest` violation → keep the text, attach an additive flag.
 *
 * Pure on purpose so it can be unit-tested without the route's auth/DB plumbing.
 */
export function computeGuardedChatPayload(
  text: string,
  guardrails: ResolvedGuardrails | null,
): ChatPayload {
  if (!guardrails) return { message: text };

  const violations = checkViolations(text, guardrails);
  if (violations.length === 0) return { message: text };

  const flaggedPhrases = [...new Set(violations.map((v) => v.phrase))];

  if (guardrails.enforcementLevel === "block") {
    const bodies = guardrails.regulatoryBodies.join(", ");
    return {
      message: "",
      compliance: {
        blocked: true,
        level: "block",
        flaggedPhrases,
        message: `This response conflicts with your compliance guardrails${
          bodies ? ` (${bodies})` : ""
        }. Rephrase without restricted claims, or send for compliance review.`,
      },
    };
  }

  return {
    message: text,
    compliance: { level: guardrails.enforcementLevel, flaggedPhrases },
  };
}
