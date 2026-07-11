import { beforeAll, describe, expect, it } from "vitest";
import {
  metaConnectErrorPath,
  metaConnectSuccessPath,
  openMetaOAuthPending,
  parseMetaOAuthReturnTo,
  sealMetaOAuthPending,
} from "@/lib/meta-oauth-pending";

beforeAll(() => {
  process.env.TOKEN_ENC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("meta-oauth-pending", () => {
  it("round-trips pending payload", () => {
    const payload = {
      locationId: "loc-1",
      userToken: "user-token",
      tokenExpiresAt: "2026-12-01T00:00:00.000Z",
      returnTo: "organization" as const,
    };
    const sealed = sealMetaOAuthPending(payload);
    expect(openMetaOAuthPending(sealed)).toEqual(payload);
  });

  it("builds return paths", () => {
    expect(metaConnectSuccessPath("organization")).toBe(
      "/dashboard/organization?meta_connected=1",
    );
    expect(metaConnectErrorPath("settings", "Nope")).toContain("/dashboard/settings");
    expect(metaConnectErrorPath("settings", "Nope")).toContain("Nope");
  });

  it("parses returnTo", () => {
    expect(parseMetaOAuthReturnTo("organization")).toBe("organization");
    expect(parseMetaOAuthReturnTo(null)).toBe("settings");
  });
});
