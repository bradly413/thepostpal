export type MetaOAuthReturnTo = "organization" | "settings" | "onboarding";

export function buildMetaLoginUrl(
  locationId: string,
  returnTo: MetaOAuthReturnTo = "settings",
): string {
  const params = new URLSearchParams({
    locationId,
    returnTo,
  });
  return `/api/auth/meta/login?${params.toString()}`;
}
