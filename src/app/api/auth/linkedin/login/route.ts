import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthContext } from "@/lib/api-auth";
import { linkedinProvider } from "@/lib/social/providers/linkedin";
import { resolveLinkedInRedirectUri } from "@/lib/social/providers/linkedin-routes";
import { resolveMetaConnectLocationId } from "@/lib/session-provision";

function cookieOpts(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    path: "/",
    maxAge,
    sameSite: "lax" as const,
    httpOnly: true,
    secure,
  };
}

function redirectWithError(req: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(
      `/dashboard/settings?meta_error=${encodeURIComponent(message)}`,
      req.url,
    ),
  );
}

/**
 * GET /api/auth/linkedin/login?locationId=...
 * Starts LinkedIn OIDC OAuth for member-feed publishing.
 */
export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    const next = encodeURIComponent("/dashboard/settings");
    return NextResponse.redirect(new URL(`/sign-in?next=${next}`, req.url));
  }

  if (!process.env.LINKEDIN_CLIENT_ID?.trim()) {
    return redirectWithError(
      req,
      "LinkedIn is not configured (LINKEDIN_CLIENT_ID).",
    );
  }

  const requestedLocationId = req.nextUrl.searchParams.get("locationId");
  const locationId = await resolveMetaConnectLocationId(
    auth.tenantId,
    auth.userId,
    requestedLocationId,
  );

  if (!locationId) {
    return redirectWithError(
      req,
      "Your workspace is still setting up. Refresh the page, then try Connect again.",
    );
  }

  const state = randomUUID();
  const redirectUri = resolveLinkedInRedirectUri(req);
  const redirectUrl = linkedinProvider.getAuthUrl(state, redirectUri);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("linkedin_oauth_state", state, cookieOpts(600));
  response.cookies.set("linkedin_oauth_location_id", locationId, cookieOpts(600));
  return response;
}

export const dynamic = "force-dynamic";
