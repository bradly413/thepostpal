import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  safeRedirectPath,
  SIGNIN_NEXT_DEFAULT,
} from "@/lib/safe-redirect";

function getSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "posterboy-dev-fallback-secret-change-me";
  return new TextEncoder().encode(secret);
}

const PUBLIC_EXACT = ["/", "/sign-in", "/privacy", "/terms"];
const PUBLIC_PREFIXES = [
  "/pricing",
  "/for/",
  "/tools/",
  "/uploads/",
  "/images/",
  "/previews/",
  "/mockup-library/",
  "/brand/",
  "/videos/",
  "/api/auth",
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  let sessionValid = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
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

  if (!sessionValid) {
    return NextResponse.redirect(signInUrl(request, pathname));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|previews/|mockup-library/|brand/|videos/|logos/).*)",
  ],
};
