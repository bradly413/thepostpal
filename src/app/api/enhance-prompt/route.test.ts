import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const enhanceMocks = vi.hoisted(() => ({
  expandImageBrief: vi.fn(),
}));

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

vi.mock("@/lib/studio/art-director", () => ({
  expandImageBrief: enhanceMocks.expandImageBrief,
}));

vi.mock("@/lib/ai-brand-context", () => ({
  buildTenantImageBrandContext: vi.fn(async () => ""),
  buildTenantGeography: vi.fn(async () => ""),
}));

function request(body: string) {
  return POST(
    new NextRequest("http://localhost/api/enhance-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

describe("POST /api/enhance-prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    vi.stubEnv("GEMINI_API_KEY", "");
  });

  it("returns the art-directed prompt", async () => {
    enhanceMocks.expandImageBrief.mockResolvedValue(
      "A vivid commercial photograph of a chef chopping fresh herbs.",
    );

    const response = await request(
      JSON.stringify({ prompt: "chef cutting herbs" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enhanced: "A vivid commercial photograph of a chef chopping fresh herbs.",
    });
  });

  it("reports an already optimized prompt instead of failing silently", async () => {
    const prompt = "A detailed commercial photograph of a chef chopping herbs.";
    enhanceMocks.expandImageBrief.mockResolvedValue(prompt);

    const response = await request(JSON.stringify({ prompt }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enhanced: prompt,
      unchanged: true,
    });
  });

  it("rejects invalid JSON", async () => {
    const response = await request("{");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body",
    });
  });

  it("reports when no enhancement provider is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await request(
      JSON.stringify({ prompt: "chef cutting herbs" }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Prompt enhancement is temporarily unavailable",
    });
  });
});
