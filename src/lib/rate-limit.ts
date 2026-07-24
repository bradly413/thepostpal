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

let warnedNoRedis = false;

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    // Fail SAFE, not closed: prod runs without Upstash (graceful-degrade env),
    // and throwing here 503'd EVERY rate-limited route — generation, captions,
    // uploads — the moment this shipped. Per-instance in-memory limiting is
    // weaker than shared Redis, but a bypassable limit beats a broken product.
    // Configure UPSTASH_REDIS_REST_URL for real enforcement.
    if (process.env.NODE_ENV === "production" && !warnedNoRedis) {
      warnedNoRedis = true;
      console.warn(
        "[rate-limit] No Redis in production — using per-instance in-memory limits. Configure Upstash for shared enforcement.",
      );
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
  // Vercel sets x-real-ip to the true connecting IP — prefer it. x-forwarded-for
  // is client-prependable (spoofable at the FRONT), so if we fall back to it we
  // take the LAST hop, which is the address the platform proxy actually saw.
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "unknown";
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
