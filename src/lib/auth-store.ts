import "server-only";

import { promises as fs } from "fs";
import { getRedis } from "@/lib/redis";
import path from "path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";

export type AuthRole = "owner" | "admin" | "member";

export interface AuthAccountRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface AuthUserRecord {
  id: string;
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  passwordSalt: string;
  role: AuthRole;
  createdAt: string;
}

export interface SessionUser {
  userId: string;
  accountId: string;
  accountName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AuthRole;
}

interface AuthStoreSnapshot {
  accounts: AuthAccountRecord[];
  users: AuthUserRecord[];
}

const STORE_DIR = path.join(process.env.AUTH_STORE_DIR || "/tmp", "posterboy-social");
const STORE_PATH = path.join(STORE_DIR, "auth-store.json");

const EMAIL_KEY_PREFIX = "auth:user-email:";
const USER_KEY_PREFIX = "auth:user:";
const ACCOUNT_KEY_PREFIX = "auth:account:";

export class AuthEmailExistsError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "AuthEmailExistsError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createWorkspaceName(firstName: string, lastName: string): string {
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  return fullName ? `${fullName} Workspace` : "Posterboy Social Workspace";
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "posterboy-workspace";
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    passwordSalt: salt,
    passwordHash: scryptSync(password, salt, 64).toString("hex"),
  };
}

function verifyPassword(password: string, passwordSalt: string, passwordHash: string): boolean {
  const candidate = Buffer.from(scryptSync(password, passwordSalt, 64).toString("hex"), "hex");
  const expected = Buffer.from(passwordHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function toSessionUser(user: AuthUserRecord, account: AuthAccountRecord | null): SessionUser {
  return {
    userId: user.id,
    accountId: user.accountId,
    accountName: account?.name || "Posterboy Social Workspace",
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

async function readFileSnapshot(): Promise<AuthStoreSnapshot> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AuthStoreSnapshot>;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  } catch {
    return { accounts: [], users: [] };
  }
}

async function writeFileSnapshot(snapshot: AuthStoreSnapshot): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(snapshot, null, 2));
}

async function getStoredUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  const redis = getRedis();

  if (redis) {
    const userId = await redis.get<string | null>(`${EMAIL_KEY_PREFIX}${normalizedEmail}`);
    if (!userId) return null;
    return (await redis.get<AuthUserRecord | null>(`${USER_KEY_PREFIX}${userId}`)) || null;
  }

  const snapshot = await readFileSnapshot();
  return snapshot.users.find((user) => user.email === normalizedEmail) || null;
}

async function getStoredAccountById(accountId: string): Promise<AuthAccountRecord | null> {
  const redis = getRedis();

  if (redis) {
    return (await redis.get<AuthAccountRecord | null>(`${ACCOUNT_KEY_PREFIX}${accountId}`)) || null;
  }

  const snapshot = await readFileSnapshot();
  return snapshot.accounts.find((account) => account.id === accountId) || null;
}

async function saveStoredAccount(account: AuthAccountRecord): Promise<void> {
  const redis = getRedis();

  if (redis) {
    await redis.set(`${ACCOUNT_KEY_PREFIX}${account.id}`, account);
    return;
  }

  const snapshot = await readFileSnapshot();
  snapshot.accounts.push(account);
  await writeFileSnapshot(snapshot);
}

async function saveStoredUser(user: AuthUserRecord): Promise<void> {
  const redis = getRedis();

  if (redis) {
    await redis.set(`${USER_KEY_PREFIX}${user.id}`, user);
    await redis.set(`${EMAIL_KEY_PREFIX}${user.email}`, user.id);
    return;
  }

  const snapshot = await readFileSnapshot();
  snapshot.users.push(user);
  await writeFileSnapshot(snapshot);
}

export async function registerUserAccount(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<SessionUser> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;

  const existingUser = await getStoredUserByEmail(email);
  if (existingUser) {
    throw new AuthEmailExistsError();
  }

  const account: AuthAccountRecord = {
    id: randomUUID(),
    name: createWorkspaceName(firstName, lastName),
    slug: slugify(`${firstName}-${lastName}`),
    createdAt: new Date().toISOString(),
  };

  const passwordState = hashPassword(password);
  const user: AuthUserRecord = {
    id: randomUUID(),
    accountId: account.id,
    email,
    firstName,
    lastName,
    passwordHash: passwordState.passwordHash,
    passwordSalt: passwordState.passwordSalt,
    role: "owner",
    createdAt: new Date().toISOString(),
  };

  await saveStoredAccount(account);
  await saveStoredUser(user);

  return toSessionUser(user, account);
}

export async function authenticateStoredUser(identifier: string, password: string): Promise<SessionUser | null> {
  const user = await getStoredUserByEmail(identifier);
  if (!user) return null;

  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  const account = await getStoredAccountById(user.accountId);
  return toSessionUser(user, account);
}

export async function getStoredUserById(userId: string): Promise<AuthUserRecord | null> {
  const redis = getRedis();
  if (redis) {
    return (await redis.get<AuthUserRecord | null>(`${USER_KEY_PREFIX}${userId}`)) || null;
  }
  const snapshot = await readFileSnapshot();
  return snapshot.users.find((user) => user.id === userId) || null;
}

async function persistStoredUser(user: AuthUserRecord): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(`${USER_KEY_PREFIX}${user.id}`, user);
    await redis.set(`${EMAIL_KEY_PREFIX}${user.email}`, user.id);
    return;
  }
  const snapshot = await readFileSnapshot();
  const index = snapshot.users.findIndex((entry) => entry.id === user.id);
  if (index >= 0) {
    snapshot.users[index] = user;
  } else {
    snapshot.users.push(user);
  }
  await writeFileSnapshot(snapshot);
}

async function removeStoredUser(user: AuthUserRecord): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(`${USER_KEY_PREFIX}${user.id}`);
    await redis.del(`${EMAIL_KEY_PREFIX}${user.email}`);
    return;
  }
  const snapshot = await readFileSnapshot();
  snapshot.users = snapshot.users.filter((entry) => entry.id !== user.id);
  await writeFileSnapshot(snapshot);
}

async function removeStoredAccount(accountId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(`${ACCOUNT_KEY_PREFIX}${accountId}`);
    return;
  }
  const snapshot = await readFileSnapshot();
  snapshot.accounts = snapshot.accounts.filter((entry) => entry.id !== accountId);
  await writeFileSnapshot(snapshot);
}

export function isPasswordStrong(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function updateStoredUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "invalid_current" | "weak_password" }> {
  if (!isPasswordStrong(newPassword)) {
    return { ok: false, reason: "weak_password" };
  }

  const user = await getStoredUserById(userId);
  if (!user) return { ok: false, reason: "not_found" };

  if (!verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
    return { ok: false, reason: "invalid_current" };
  }

  const passwordState = hashPassword(newPassword);
  await persistStoredUser({
    ...user,
    passwordHash: passwordState.passwordHash,
    passwordSalt: passwordState.passwordSalt,
  });

  return { ok: true };
}

/** Removes auth-store credentials for a workspace owner (Postgres org is deleted separately). */
export async function deleteAuthStoreForAccount(accountId: string, userId: string): Promise<void> {
  const user = await getStoredUserById(userId);
  if (user && user.accountId === accountId) {
    await removeStoredUser(user);
  }
  await removeStoredAccount(accountId);
}
