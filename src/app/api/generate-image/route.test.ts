import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
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

vi.mock("@/lib/db", () => ({
  withTenantDb: vi.fn(async (_auth: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      organization: {
        findUnique: vi.fn(async () => ({ plan: "solo", brandEngine: null })),
      },
    }),
  ),
}));

vi.mock("@/lib/studio/vision-image-input", () => ({
  referenceImageToGeminiInline: vi.fn(async () => null),
}));

const LISTING_PROMPT =
  "make an instagram post about my new listing 223 victor ct. in ballwin, mo 63021";

const TINY_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAD8AXwD/2Q==";

function postGenerateImage(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/generate-image", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
  });

  it("requires a readable reference when listingMode is set", async () => {
    const res = await postGenerateImage({
      prompt: "Professional listing exterior",
      listingMode: true,
      sourceIntent: LISTING_PROMPT,
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/property photo attached/i);
  });

  it("returns 422 when reference image cannot be loaded", async () => {
    const res = await postGenerateImage({
      prompt: "Enhance listing photo",
      referenceImage: TINY_JPEG,
      sourceIntent: LISTING_PROMPT,
      listingMode: true,
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/could not read your listing photo/i);
  });
});
