import "server-only";

import { Redis } from "@upstash/redis";

const SIGNUP_KEY_PREFIX = "signup:";
const OAUTH_KEY_PREFIX = "oauth:";
const DEFAULT_TTL_SECONDS = 3600;

function redisRestUrl(): string {
  return (
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    ""
  );
}

function redisRestToken(): string {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    ""
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(redisRestUrl() && redisRestToken());
}

let cachedClient: Redis | null | undefined;

/** Shared Upstash client (also reads Vercel KV env aliases). */
export function getRedis(): Redis | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!isRedisConfigured()) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new Redis({
    url: redisRestUrl(),
    token: redisRestToken(),
  });

  return cachedClient;
}

function parseStoredJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

async function setJson(key: string, data: unknown, ex = DEFAULT_TTL_SECONDS): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.set(key, JSON.stringify(data), { ex });
}

async function getJson<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  const raw = await client.get(key);
  return parseStoredJson<T>(raw);
}

/** Temporary multi-step signup payload (expires in 1 hour). */
export async function cacheSignupState(sessionId: string, data: unknown): Promise<void> {
  if (!sessionId.trim()) return;
  await setJson(`${SIGNUP_KEY_PREFIX}${sessionId}`, data);
}

export async function getSignupState<T = unknown>(sessionId: string): Promise<T | null> {
  if (!sessionId.trim()) return null;
  return getJson<T>(`${SIGNUP_KEY_PREFIX}${sessionId}`);
}

export async function clearSignupState(sessionId: string): Promise<void> {
  const client = getRedis();
  if (!client || !sessionId.trim()) return;
  await client.del(`${SIGNUP_KEY_PREFIX}${sessionId}`);
}

/** OAuth / Meta state payloads (expires in 1 hour). */
export async function cacheOAuthState(stateId: string, data: unknown): Promise<void> {
  if (!stateId.trim()) return;
  await setJson(`${OAUTH_KEY_PREFIX}${stateId}`, data);
}

export async function getOAuthState<T = unknown>(stateId: string): Promise<T | null> {
  if (!stateId.trim()) return null;
  return getJson<T>(`${OAUTH_KEY_PREFIX}${stateId}`);
}

export async function clearOAuthState(stateId: string): Promise<void> {
  const client = getRedis();
  if (!client || !stateId.trim()) return;
  await client.del(`${OAUTH_KEY_PREFIX}${stateId}`);
}
