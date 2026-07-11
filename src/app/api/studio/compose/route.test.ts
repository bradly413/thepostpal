import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/api-auth", () => ({
  requireAuthContext: vi.fn(async () => ({
    userId: "user-1",
    tenantId: "tenant-1",
    organizationId: "tenant-1",
    role: "owner",
    isSuperadmin: false,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => true),
  buildRateLimitKey: vi.fn(() => "test-key"),
  RateLimitUnavailableError: class RateLimitUnavailableError extends Error {},
}));

const LISTING_PROMPT =
  "make an instagram post about my new listing 223 victor ct. in ballwin, mo 63021";

describe("POST /api/studio/compose", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("returns listing_photo_required when listing has no attached photo", async () => {
    const res = await POST(
      new Request("http://localhost/api/studio/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: LISTING_PROMPT, hasReferenceImage: false }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.code).toBe("listing_photo_required");
    expect(body.error).toMatch(/listing photo/i);
  });
});
