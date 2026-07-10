import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

// Locks the cron-auth posture the security sweep examined: with CRON_SECRET set
// it requires an exact Bearer match; without it, it fails CLOSED whenever the app
// is "real" (production OR a DATABASE_URL is configured) and only relaxes in a
// bare local dev environment.

function req(authHeader?: string): NextRequest {
  return {
    headers: new Headers(authHeader ? { authorization: authHeader } : {}),
  } as unknown as NextRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyCronSecret with CRON_SECRET set", () => {
  it("accepts an exact Bearer match", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(req("Bearer s3cret"))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(req("Bearer nope"))).toBe(false);
  });

  it("rejects a missing / malformed header", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(req(undefined))).toBe(false);
    expect(verifyCronSecret(req("s3cret"))).toBe(false); // no "Bearer " prefix
  });

  it("rejects a length-mismatched secret (timing-safe path)", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(req("Bearer s3cret-longer"))).toBe(false);
  });
});

describe("verifyCronSecret with CRON_SECRET unset", () => {
  it("fails CLOSED in production", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    expect(verifyCronSecret(req("Bearer anything"))).toBe(false);
  });

  it("fails CLOSED when a DATABASE_URL is configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/db");
    expect(verifyCronSecret(req(undefined))).toBe(false);
  });

  it("relaxes only in a bare local-dev env (no prod, no DB)", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    expect(verifyCronSecret(req(undefined))).toBe(true);
  });
});
