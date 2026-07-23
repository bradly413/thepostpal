import "server-only";

import { getRedis } from "@/lib/redis";

const KEY_PREFIX = "ai-cal-del:";
/** 10 minutes — matches the assistant confirm UI window. */
export const CALENDAR_PENDING_DELETE_TTL_SECONDS = 10 * 60;

export type CalendarPendingDelete = {
  token: string;
  tenantId: string;
  locationId: string;
  userId: string;
  ids: string[];
  summary: string;
  expiresAt: number;
};

/** Dev / no-Redis fallback — single instance only. */
const memoryStore = new Map<string, CalendarPendingDelete>();

function pruneMemory(now = Date.now()) {
  for (const [token, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(token);
  }
}

function keyFor(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

/**
 * Persist a pending mass-delete confirmation.
 * Prefers Upstash/KV so Fluid Compute instances share tokens; falls back to
 * process memory when Redis is not configured (local / degraded prod).
 */
export async function setCalendarPendingDelete(
  entry: CalendarPendingDelete,
  ttlSeconds = CALENDAR_PENDING_DELETE_TTL_SECONDS,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(keyFor(entry.token), entry, { ex: ttlSeconds });
    return;
  }
  pruneMemory();
  memoryStore.set(entry.token, entry);
}

export async function getCalendarPendingDelete(
  token: string,
): Promise<CalendarPendingDelete | null> {
  if (!token.trim()) return null;

  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<CalendarPendingDelete | string>(keyFor(token));
    if (raw == null) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as CalendarPendingDelete;
      } catch {
        return null;
      }
    }
    return raw;
  }

  pruneMemory();
  const entry = memoryStore.get(token) ?? null;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(token);
    return null;
  }
  return entry;
}

export async function clearCalendarPendingDelete(token: string): Promise<void> {
  if (!token.trim()) return;
  const redis = getRedis();
  if (redis) {
    await redis.del(keyFor(token));
    return;
  }
  memoryStore.delete(token);
}

/** Test-only: wipe the in-memory fallback store. */
export function __resetCalendarPendingDeleteMemoryForTests(): void {
  memoryStore.clear();
}
