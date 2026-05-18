import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { authenticateStoredUser } from "@/lib/auth-store";

export interface SessionPayload extends JWTPayload {
  role: string;
  legacy?: boolean;
  sub?: string;
  accountId?: string;
  accountName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

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

async function verifyLegacyCredentials(identifier: string, password: string): Promise<boolean> {
  const expected = getCredentials();
  const userMatch = identifier.length === expected.username.length &&
    timingSafeEqual(new TextEncoder().encode(identifier), new TextEncoder().encode(expected.username));
  const passMatch = password.length === expected.password.length &&
    timingSafeEqual(new TextEncoder().encode(password), new TextEncoder().encode(expected.password));
  return userMatch && passMatch;
}

export async function authenticateUser(identifier: string, password: string): Promise<SessionPayload | null> {
  const persistedUser = await authenticateStoredUser(identifier, password);
  if (persistedUser) {
    return {
      role: persistedUser.role,
      sub: persistedUser.userId,
      accountId: persistedUser.accountId,
      accountName: persistedUser.accountName,
      email: persistedUser.email,
      firstName: persistedUser.firstName,
      lastName: persistedUser.lastName,
    };
  }

  if (await verifyLegacyCredentials(identifier, password)) {
    return { role: "admin", legacy: true };
  }

  return null;
}

export async function verifyCredentials(identifier: string, password: string): Promise<boolean> {
  return (await authenticateUser(identifier, password)) !== null;
}

export async function createSession(payload: SessionPayload = { role: "admin", legacy: true }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
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

export async function getSessionData(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}
