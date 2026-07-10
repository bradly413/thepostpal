/**
 * Lead identity for the paid brand-book generation path.
 *
 * The AI voice call (generateBrandVoiceStructured) costs money on the API key.
 * Anonymous guests must not be able to farm it, so the route requires an
 * identity — an authenticated session OR a captured email — before making the
 * paid call. These helpers are pure so they can be unit-tested independently of
 * the route's auth/DB plumbing.
 */

const MAX_EMAIL_LEN = 254;
// Deliberately permissive but real: one @, a dotted domain, no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `value` is a plausibly-real email we can use as a captured lead. */
export function isValidLeadEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.length > 0 && v.length <= MAX_EMAIL_LEN && EMAIL_RE.test(v);
}

/** Normalize a captured email for storage/keying (trimmed + lowercased). */
export function normalizeLeadEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Pick a captured lead email from the request, preferring an explicit top-level
 * `email` and falling back to one carried inside the onboarding answers.
 * Returns the normalized email, or null when none is valid.
 */
export function pickLeadEmail(
  ...candidates: unknown[]
): string | null {
  for (const c of candidates) {
    if (isValidLeadEmail(c)) return normalizeLeadEmail(c);
  }
  return null;
}

export interface PaidGenerationGate {
  /** Whether the paid AI voice call is allowed to run. */
  allowed: boolean;
  /** When blocked, the client should capture an email before retrying. */
  emailRequired: boolean;
  /** The captured lead email, if any (null for authenticated sessions). */
  leadEmail: string | null;
}

/**
 * Decide whether the paid generation may proceed.
 * Authenticated sessions always pass. Guests must supply a valid email.
 */
export function resolvePaidGenerationGate(args: {
  isSession: boolean;
  leadEmail: string | null;
}): PaidGenerationGate {
  if (args.isSession) {
    return { allowed: true, emailRequired: false, leadEmail: args.leadEmail };
  }
  if (args.leadEmail) {
    return { allowed: true, emailRequired: false, leadEmail: args.leadEmail };
  }
  return { allowed: false, emailRequired: true, leadEmail: null };
}
