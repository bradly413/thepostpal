import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthSecret, getAuthSecretBytes } from "@/lib/auth-secret";

// The auth secret backs JWT signing/verification. It must NEVER silently fall
// back to the dev placeholder in production — that would make sessions forgeable.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthSecret", () => {
  it("returns AUTH_SECRET when set", () => {
    vi.stubEnv("AUTH_SECRET", "real-secret");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(getAuthSecret()).toBe("real-secret");
  });

  it("falls back to JWT_SECRET / NEXTAUTH_SECRET", () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("JWT_SECRET", "jwt-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(getAuthSecret()).toBe("jwt-secret");

    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "nextauth-secret");
    expect(getAuthSecret()).toBe("nextauth-secret");
  });

  it("ignores whitespace-only secrets", () => {
    vi.stubEnv("AUTH_SECRET", "   ");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAuthSecret()).not.toBe("   ");
  });

  it("THROWS in production when no secret is configured", () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAuthSecret()).toThrow(/Missing auth secret in production/);
  });

  it("uses a dev fallback only outside production", () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAuthSecret()).toMatch(/dev-fallback/);
  });

  it("getAuthSecretBytes encodes the resolved secret", () => {
    vi.stubEnv("AUTH_SECRET", "abc");
    expect(getAuthSecretBytes()).toEqual(new TextEncoder().encode("abc"));
  });
});
