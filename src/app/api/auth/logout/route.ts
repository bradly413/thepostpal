import { NextResponse } from "next/server";
import { clearAuthSessionCookies } from "@/lib/session-cookies";

/**
 * POST /api/auth/logout
 * Clears the httpOnly session cookie and Meta OAuth state cookies.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAuthSessionCookies(response);
  return response;
}
