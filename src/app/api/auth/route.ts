import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { isAuthStoreUnavailableError } from "@/lib/auth-store";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { sessionPayloadToProvisioner } from "@/lib/session-provision";
import { ensureTenantProvisioned } from "@/lib/tenant-provisioning";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("auth", request.headers), 5, 60_000))) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a minute." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const { username, email, identifier, password } = await request.json();
  const loginIdentifier = [identifier, email, username].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  ) as string | undefined;

  if (!loginIdentifier || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  try {
    const sessionPayload = await authenticateUser(loginIdentifier, password);
    if (!sessionPayload) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    const provisioner = sessionPayloadToProvisioner(sessionPayload);
    if (provisioner && !sessionPayload.legacy) {
      await ensureTenantProvisioned(provisioner);
    }

    const token = await createSession(sessionPayload);
    const response = NextResponse.json({ success: true });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    if (isAuthStoreUnavailableError(error)) {
      return NextResponse.json({ error: "Authentication storage unavailable" }, { status: 503 });
    }
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Could not sign in right now." }, { status: 500 });
  }
}
