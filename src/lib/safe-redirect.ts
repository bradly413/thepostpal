/** Prevent open redirects; only allow same-site relative paths. */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.startsWith("/sign-in")) return fallback;
  return path;
}

// Real onboarding (brand-book generation) lives at /onboarding/classic.
// /onboarding itself is the cinematic Brand Architect concept, which is not
// yet wired to generate a brand book — so signup flows target the wizard.
export const SIGNUP_NEXT_DEFAULT = "/onboarding/classic";
export const SIGNIN_NEXT_DEFAULT = "/dashboard";

/** Marketing + hero CTAs: create account, then brand onboarding. */
export const SIGNUP_ONBOARDING_URL =
  "/sign-in?mode=signup&next=%2Fonboarding%2Fclassic";
