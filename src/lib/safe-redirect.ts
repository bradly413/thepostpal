/** Prevent open redirects; only allow same-site relative paths. */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.startsWith("/sign-in")) return fallback;
  return path;
}

// Canonical onboarding is the Brand Architect at /onboarding — it now collects
// the business identity + industry and generates a real brand book (Stage 1).
// The old /onboarding/classic + /onboarding/concept prototypes have been retired.
export const SIGNUP_NEXT_DEFAULT = "/onboarding";
export const SIGNIN_NEXT_DEFAULT = "/dashboard";

/** Marketing + hero CTAs: create account, then brand onboarding. */
export const SIGNUP_ONBOARDING_URL =
  "/sign-in?mode=signup&next=%2Fonboarding";
