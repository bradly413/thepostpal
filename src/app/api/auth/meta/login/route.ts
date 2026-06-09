import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { getAuthLoginUrl } from "@/lib/meta";

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

/**
 * GET /api/auth/meta/login?locationId=...
 * Starts Meta OAuth for Facebook Page + Instagram Business publishing.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent("/dashboard/settings");
    return NextResponse.redirect(new URL(`/sign-in?next=${next}`, req.url));
  }

  const appId =
    process.env.META_CLIENT_ID || process.env.NEXT_PUBLIC_META_APP_ID || "";
  if (!appId) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?meta_error=" +
          encodeURIComponent("Meta App ID not configured (META_CLIENT_ID)"),
        req.url,
      ),
    );
  }

  const locationId = req.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?meta_error=" +
          encodeURIComponent("locationId is required to connect Meta"),
        req.url,
      ),
    );
  }

  const state = randomUUID();
  const redirectUrl = getAuthLoginUrl(state);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("meta_oauth_state", state, cookieOpts(600));
  response.cookies.set("meta_oauth_location_id", locationId, cookieOpts(600));
  return response;
}

export const dynamic = "force-dynamic";
