import { afterEach, describe, expect, it, vi } from "vitest";
import { isSuperadminEmail, resolveSessionSuperadmin } from "@/lib/superadmin-allowlist";

describe("superadmin allowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches emails case-insensitively against POSTERBOY_SUPERADMIN_EMAILS", () => {
    vi.stubEnv("POSTERBOY_SUPERADMIN_EMAILS", "Admin@Example.com,other@x.com");
    expect(isSuperadminEmail("admin@example.com")).toBe(true);
    expect(isSuperadminEmail("other@x.com")).toBe(true);
    expect(isSuperadminEmail("stranger@x.com")).toBe(false);
  });

  it("resolves session superadmin from email allowlist", () => {
    vi.stubEnv("POSTERBOY_SUPERADMIN_EMAILS", "cam@posterboysocial.com");
    expect(
      resolveSessionSuperadmin({ email: "cam@posterboysocial.com" }),
    ).toBe(true);
    expect(
      resolveSessionSuperadmin({ email: "demo@posterboysocial.com" }),
    ).toBe(false);
  });
});
