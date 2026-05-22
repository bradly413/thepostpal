/** Canonical posterboy domain and contact — single source for URLs. */

export const SITE_URL = "https://www.posterboysocial.com";
export const SITE_DOMAIN = "posterboysocial.com";
export const SITE_NAME = "posterboy";
export const CONTACT_EMAIL = "hello@posterboysocial.com";

export const SITE_ROUTES = {
  home: SITE_URL,
  signIn: `${SITE_URL}/sign-in`,
  pricing: `${SITE_URL}/pricing`,
  drafts: `${SITE_URL}/dashboard/drafts`,
} as const;
