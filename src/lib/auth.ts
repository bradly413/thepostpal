import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

function getPassword() {
  const pw = process.env.PORTAL_PASSWORD;
  if (!pw) throw new Error("PORTAL_PASSWORD environment variable is required");
  return pw;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = getPassword();
  if (password.length !== expected.length) return false;
  return timingSafeEqual(
    new TextEncoder().encode(password),
    new TextEncoder().encode(expected),
  );
}

export async function createSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
