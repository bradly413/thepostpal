import { describe, expect, it } from "vitest";
import {
  parseSocialOAuthReturnTo,
  socialOAuthErrorPath,
  socialOAuthSuccessPath,
} from "@/lib/social-oauth-return";

describe("social-oauth-return", () => {
  it("parses return targets", () => {
    expect(parseSocialOAuthReturnTo("onboarding")).toBe("onboarding");
    expect(parseSocialOAuthReturnTo("organization")).toBe("organization");
    expect(parseSocialOAuthReturnTo("nope")).toBe("settings");
  });

  it("builds onboarding paths per provider", () => {
    expect(socialOAuthSuccessPath("onboarding", "tiktok")).toBe(
      "/onboarding?tiktok_connected=1",
    );
    expect(socialOAuthErrorPath("onboarding", "Denied", "linkedin")).toContain(
      "/onboarding?linkedin_error=",
    );
  });
});
