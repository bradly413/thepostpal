import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

function getCredentials() {
  const username = process.env.PORTAL_USERNAME;
  const pw = process.env.PORTAL_PASSWORD;
  if (!username || !pw) throw new Error("PORTAL_USERNAME and PORTAL_PASSWORD environment variables are required");
  return { username, password: pw };
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const expected = getCredentials();
  const userMatch = username.length === expected.username.length &&
    timingSafeEqual(new TextEncoder().encode(username), new TextEncoder().encode(expected.username));
  const passMatch = password.length === expected.password.length &&
    timingSafeEqual(new TextEncoder().encode(password), new TextEncoder().encode(expected.password));
  return userMatch && passMatch;
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
