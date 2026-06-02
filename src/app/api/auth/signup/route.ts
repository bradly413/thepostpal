import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { AuthEmailExistsError, registerUserAccount } from "@/lib/auth-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
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

  const ip = getClientIp(request.headers);
  if (!rateLimit(`signup:${ip}`, 3, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const { firstName, lastName, email, password } = await request.json();

  if (
    !firstName || !lastName || !email || !password ||
    typeof firstName !== "string" || typeof lastName !== "string" ||
    typeof email !== "string" || typeof password !== "string"
  ) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json({ error: "Password must contain at least one letter and one number." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  try {
    const sessionUser = await registerUserAccount({ firstName, lastName, email, password });
    await ensureTenantProvisioned(sessionUser);
    const token = await createSession({
      role: sessionUser.role,
      sub: sessionUser.userId,
      tenantId: sessionUser.accountId,
      accountId: sessionUser.accountId,
      accountName: sessionUser.accountName,
      email: sessionUser.email,
      firstName: sessionUser.firstName,
      lastName: sessionUser.lastName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: sessionUser.userId,
        email: sessionUser.email,
        firstName: sessionUser.firstName,
        lastName: sessionUser.lastName,
        role: sessionUser.role,
      },
      account: {
        id: sessionUser.accountId,
        name: sessionUser.accountName,
      },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof AuthEmailExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Could not create your account right now." }, { status: 500 });
  }
}
