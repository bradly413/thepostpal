import type { NextResponse } from "next/server";

const SESSION_COOKIES = [
  "session",
  "meta_oauth_state",
  "meta_oauth_location_id",
  "meta_connection",
] as const;

function sessionCookieOptions() {
  return {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Expire auth/session cookies on a NextResponse (httpOnly — must be server-side). */
export function clearAuthSessionCookies(response: NextResponse): void {
  const opts = sessionCookieOptions();
  for (const name of SESSION_COOKIES) {
    response.cookies.set(name, "", opts);
    response.cookies.delete(name);
  }
}
