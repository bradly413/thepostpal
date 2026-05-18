import "server-only";

import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
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

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(STORE_DIR, "auth-store.json");

const EMAIL_KEY_PREFIX = "auth:user-email:";
const USER_KEY_PREFIX = "auth:user:";
const ACCOUNT_KEY_PREFIX = "auth:account:";

let redisClient: Redis | null | undefined;

export class AuthEmailExistsError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "AuthEmailExistsError";
  }
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = Redis.fromEnv();
      return redisClient;
    }
  } catch {
    // Fall through to the file-backed store used for local/dev fallback.
  }

  redisClient = null;
  return redisClient;
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
  const redis = getRedisClient();

  if (redis) {
    const userId = await redis.get<string | null>(`${EMAIL_KEY_PREFIX}${normalizedEmail}`);
    if (!userId) return null;
    return (await redis.get<AuthUserRecord | null>(`${USER_KEY_PREFIX}${userId}`)) || null;
  }

  const snapshot = await readFileSnapshot();
  return snapshot.users.find((user) => user.email === normalizedEmail) || null;
}

async function getStoredAccountById(accountId: string): Promise<AuthAccountRecord | null> {
  const redis = getRedisClient();

  if (redis) {
    return (await redis.get<AuthAccountRecord | null>(`${ACCOUNT_KEY_PREFIX}${accountId}`)) || null;
  }

  const snapshot = await readFileSnapshot();
  return snapshot.accounts.find((account) => account.id === accountId) || null;
}

async function saveStoredAccount(account: AuthAccountRecord): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    await redis.set(`${ACCOUNT_KEY_PREFIX}${account.id}`, account);
    return;
  }

  const snapshot = await readFileSnapshot();
  snapshot.accounts.push(account);
  await writeFileSnapshot(snapshot);
}

async function saveStoredUser(user: AuthUserRecord): Promise<void> {
  const redis = getRedisClient();

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
