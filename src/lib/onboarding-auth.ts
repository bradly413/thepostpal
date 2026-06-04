import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";

const GUEST_COOKIE = "onboarding_guest";

export type BrandBookAuth =
  | { mode: "session"; userId: string; auth: AuthContext }
  | { mode: "guest"; userId: string; setGuestCookie?: string };

/** Authenticated users keep their id; guests get a stable cookie-backed id for generation. */
export async function resolveBrandBookAuth(): Promise<BrandBookAuth> {
  try {
    const auth = await requireAuthContext();
    return { mode: "session", userId: auth.userId, auth };
  } catch {
    const cookieStore = await cookies();
    const existing = cookieStore.get(GUEST_COOKIE)?.value;
    const userId = existing ?? `guest-${randomUUID()}`;
    return {
      mode: "guest",
      userId,
      setGuestCookie: existing ? undefined : userId,
    };
  }
}

export function guestCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure,
  };
}

export const ONBOARDING_GUEST_COOKIE = GUEST_COOKIE;
