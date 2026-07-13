export type SocialOAuthReturnTo = "organization" | "settings" | "onboarding";

export function parseSocialOAuthReturnTo(
  value: string | null | undefined,
): SocialOAuthReturnTo {
  if (value === "organization" || value === "onboarding") return value;
  return "settings";
}

export function socialOAuthSuccessPath(
  returnTo: SocialOAuthReturnTo,
  provider: "meta" | "linkedin" | "tiktok" = "meta",
): string {
  if (returnTo === "onboarding") {
    return `/onboarding?${provider}_connected=1`;
  }
  if (returnTo === "organization") {
    return `/dashboard/organization?${provider}_connected=1`;
  }
  return `/dashboard/settings?${provider}_connected=1`;
}

export function socialOAuthErrorPath(
  returnTo: SocialOAuthReturnTo,
  message: string,
  provider: "meta" | "linkedin" | "tiktok" = "meta",
): string {
  const base =
    returnTo === "onboarding"
      ? "/onboarding"
      : returnTo === "organization"
        ? "/dashboard/organization"
        : "/dashboard/settings";
  const param = provider === "meta" ? "meta_error" : `${provider}_error`;
  return `${base}?${param}=${encodeURIComponent(message)}`;
}

/** Cookie name for LinkedIn / TikTok return targets (Meta uses META_OAUTH_RETURN_TO_COOKIE). */
export const SOCIAL_OAUTH_RETURN_TO_COOKIE = "social_oauth_return_to";
