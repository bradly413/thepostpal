import { getRedis } from "@/lib/redis";

const devBuckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limiting requires Upstash Redis in production.");
    this.name = "RateLimitUnavailableError";
  }
}

function rateLimitInMemory(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = devBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    devBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) return false;

  bucket.count += 1;
  return true;
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      throw new RateLimitUnavailableError();
    }
    return rateLimitInMemory(key, maxRequests, windowMs);
  }

  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `ratelimit:${key}:${bucket}`;
  const count = Number(await redis.incr(redisKey));
  if (count === 1) {
    await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
  }
  return count <= maxRequests;
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export function buildRateLimitKey(
  scope: string,
  headers: Headers,
  actor?: { tenantId?: string | null; userId?: string | null } | null,
): string {
  if (actor?.tenantId && actor?.userId) {
    return `${scope}:tenant:${actor.tenantId}:user:${actor.userId}`;
  }
  return `${scope}:ip:${getClientIp(headers)}`;
}
