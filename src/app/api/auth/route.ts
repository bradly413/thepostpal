import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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
  if (!rateLimit(`auth:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const { username, email, identifier, password } = await request.json();
  const loginIdentifier = [identifier, email, username].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  ) as string | undefined;

  if (!loginIdentifier || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const sessionPayload = await authenticateUser(loginIdentifier, password);
  if (!sessionPayload) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
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
}
