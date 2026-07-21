import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

const veoMocks = vi.hoisted(() => ({
  startVeoVideo: vi.fn(async () => "operations/veo-task-1"),
  getVeoTask: vi.fn(),
}));

vi.mock("@/lib/studio/veo", () => ({
  veoConfigured: () => true,
  startVeoVideo: veoMocks.startVeoVideo,
  getVeoTask: veoMocks.getVeoTask,
}));

const { startVeoVideo, getVeoTask } = veoMocks;

import { GET, POST } from "./route";

function postVideo(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/generate-video", () => {
  beforeEach(() => {
    startVeoVideo.mockClear();
    getVeoTask.mockClear();
  });

  it("requires a prompt", async () => {
    const res = await postVideo({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/prompt/i);
  });

  it("starts a Veo job and returns taskId", async () => {
    const res = await postVideo({
      prompt: "A red convertible on a coastal road at sunset",
      aspectRatio: "9:16",
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.taskId).toBe("operations/veo-task-1");
    expect(body.status).toBe("submitted");
    expect(startVeoVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "A red convertible on a coastal road at sunset",
        aspectRatio: "9:16",
        resolution: "720p",
      }),
    );
  });
});

describe("GET /api/generate-video", () => {
  it("polls task status", async () => {
    getVeoTask.mockResolvedValueOnce({
      taskId: "operations/veo-task-1",
      status: "succeed",
      videoUrl: "https://cdn.example/v.mp4",
    });
    const res = await GET(
      new NextRequest("http://localhost/api/generate-video?taskId=operations%2Fveo-task-1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("succeed");
    expect(body.videoUrl).toBe("https://cdn.example/v.mp4");
  });
});
