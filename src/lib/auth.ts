import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { authenticateStoredUser } from "@/lib/auth-store";
import { getAuthSecretBytes } from "@/lib/auth-secret";
import { resolveSessionSuperadmin } from "@/lib/superadmin-allowlist";

export { isSuperadminEmail, resolveSessionSuperadmin } from "@/lib/superadmin-allowlist";

export interface SessionPayload extends JWTPayload {
  role: string;
  legacy?: boolean;
  sub?: string;
  tenantId?: string;
  accountId?: string;
  accountName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isSuperadmin?: boolean;
}

const AUTH_SECRET_BYTES = getAuthSecretBytes();

function getCredentials(): { username: string; password: string } | null {
  const username = process.env.PORTAL_USERNAME?.trim();
  const password = process.env.PORTAL_PASSWORD?.trim();
  if (username && password) return { username, password };

  // Dev-only defaults — never enable demo/demo123 in production without explicit env.
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEMO_LOGIN === "true"
  ) {
    return { username: "demo", password: "demo123" };
  }
  return null;
}

async function verifyLegacyCredentials(identifier: string, password: string): Promise<boolean> {
  const expected = getCredentials();
  if (!expected) return false;
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
      tenantId: persistedUser.accountId,
      accountId: persistedUser.accountId,
      accountName: persistedUser.accountName,
      email: persistedUser.email,
      firstName: persistedUser.firstName,
      lastName: persistedUser.lastName,
      isSuperadmin: resolveSessionSuperadmin({ email: persistedUser.email }),
    };
  }

  if (await verifyLegacyCredentials(identifier, password)) {
    // Demo/portal login is now DB-backed: return a stable identity (fixed IDs
    // so the same demo org/user persists across logins) and intentionally omit
    // `legacy` so the auth route runs ensureTenantProvisioned() — this creates
    // the demo Organization + User + a default "Main location" and lets the
    // RLS-scoped dashboard endpoints work for the demo account.
    return {
      role: "admin",
      sub: "demo-user",
      tenantId: "demo-org",
      accountId: "demo-org",
      accountName: "Demo Workspace",
      email: "demo@posterboysocial.com",
      firstName: "Demo",
      lastName: "User",
      isSuperadmin: false,
    };
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
    .sign(AUTH_SECRET_BYTES);
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, AUTH_SECRET_BYTES);
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
    const verified = await jwtVerify(token, AUTH_SECRET_BYTES);
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}
