import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import {
  safeRedirectPath,
  SIGNIN_NEXT_DEFAULT,
} from "@/lib/safe-redirect";
import { getAuthSecretBytes } from "@/lib/auth-secret";

const AUTH_SECRET_BYTES = getAuthSecretBytes();

const PUBLIC_EXACT = [
  "/",
  "/sign-in",
  "/privacy",
  "/terms",
  // Crawler/metadata files must be reachable unauthenticated.
  "/sitemap.xml",
  "/robots.txt",
  "/favicon.ico",
];
const PUBLIC_PREFIXES = [
  "/pricing",
  "/for/",
  "/tools/",
  "/opengraph-image",
  "/twitter-image",
  "/uploads/",
  "/images/",
  "/previews/",
  "/mockup-library/",
  "/brand/",
  "/videos/",
  "/hero-ring/",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  // Guest onboarding: logged-out visitors must be able to reach the brand-book
  // wizard and generate a preview. The generate route itself handles guest vs.
  // session auth (resolveBrandBookAuth). NOTE: only the generate endpoint is
  // public — the rest of /api/brand-book (GET/PUT CRUD) stays tenant-gated.
  "/onboarding",
  "/api/brand-book/generate",
  // Guest onboarding upload analysis (resolveBrandBookAuth handles guest vs
  // session; the route enforces input caps + a rate limit; no paid AI call).
  "/api/brand-dna/analyze",
  // Guest onboarding voice calibration (resolveBrandBookAuth; paid + day-capped).
  "/api/brand-dna/calibrate",
  // public lead-magnet tool (its own IP rate limit lives in the route)
  "/api/tools/",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/logos")) return true;
  return false;
}

function signInUrl(request: NextRequest, nextPath?: string) {
  const url = new URL("/sign-in", request.url);
  if (nextPath && nextPath !== "/sign-in") {
    url.searchParams.set("next", nextPath);
  }
  return url;
}

function hasRequiredTenantScope(payload: JWTPayload): boolean {
  if (payload.legacy) return false;

  const tenantId = typeof payload.tenantId === "string"
    ? payload.tenantId
    : typeof payload.accountId === "string"
      ? payload.accountId
      : null;

  return !!(typeof payload.sub === "string" && tenantId);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  let sessionValid = false;
  let payload: JWTPayload | null = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, AUTH_SECRET_BYTES);
      payload = verified.payload;
      sessionValid = true;
    } catch {
      const response = NextResponse.redirect(signInUrl(request, pathname));
      response.cookies.delete("session");
      return response;
    }
  }

  if (sessionValid && pathname === "/sign-in") {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(
      new URL(safeRedirectPath(next, SIGNIN_NEXT_DEFAULT), request.url),
    );
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (sessionValid && !hasRequiredTenantScope(payload || {})) {
    const response = NextResponse.redirect(signInUrl(request, pathname));
    response.cookies.delete("session");
    return response;
  }

  if (!sessionValid) {
    return NextResponse.redirect(signInUrl(request, pathname));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|hero-ring/|images/|previews/|mockup-library/|brand/|videos/|logos/).*)",
  ],
};
