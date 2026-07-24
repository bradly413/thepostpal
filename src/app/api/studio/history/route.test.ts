import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  resolveAccess: vi.fn(),
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

vi.mock("@/lib/db", () => ({
  withTenantDb: vi.fn(
    async (_auth: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        studioMessage: {
          findMany: routeMocks.findMany,
          upsert: routeMocks.upsert,
        },
      }),
  ),
}));

vi.mock("@/lib/authz", () => ({
  resolveAccess: routeMocks.resolveAccess,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => true),
  buildRateLimitKey: vi.fn(() => "studio-history-test"),
  RateLimitUnavailableError: class RateLimitUnavailableError extends Error {},
}));

function getHistory(query = "locationId=location-1") {
  return GET(new NextRequest(`http://localhost/api/studio/history?${query}`));
}

function postHistory(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/studio/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/studio/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.resolveAccess.mockResolvedValue({ hasAccess: true });
    routeMocks.upsert.mockResolvedValue({ id: "stored-1" });
  });

  it("returns a tenant, location, and user-scoped chronological page", async () => {
    routeMocks.findMany.mockResolvedValue([
      {
        id: "row-2",
        clientId: "assistant-1",
        role: "assistant",
        text: "Here’s your video.",
        status: "done",
        mediaUrl: "https://media.example.com/recruiting.mp4",
        mediaUrls: ["https://media.example.com/recruiting.mp4"],
        mediaType: "video",
        aspect: "9:16",
        format: "single",
        carouselCount: null,
        sentAt: new Date("2026-07-24T02:00:00.000Z"),
      },
      {
        id: "row-1",
        clientId: "user-1-message",
        role: "user",
        text: "Make a recruiting reel",
        status: null,
        mediaUrl: null,
        mediaUrls: [],
        mediaType: null,
        aspect: null,
        format: null,
        carouselCount: null,
        sentAt: new Date("2026-07-24T01:59:00.000Z"),
      },
    ]);

    const response = await getHistory("locationId=location-1&limit=2");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.messages.map((message: { id: string }) => message.id)).toEqual([
      "user-1-message",
      "assistant-1",
    ]);
    expect(body.messages[1]).toMatchObject({
      mediaType: "video",
      imageUrl: "https://media.example.com/recruiting.mp4",
    });
    expect(routeMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "tenant-1",
          locationId: "location-1",
          userId: "user-1",
        }),
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: 3,
      }),
    );
  });

  it("upserts durable image, video, and carousel metadata by client message id", async () => {
    const response = await postHistory({
      locationId: "location-1",
      messages: [
        {
          id: "assistant-carousel",
          role: "assistant",
          text: "Here’s your carousel.",
          status: "done",
          imageUrl: "https://media.example.com/slide-1.png",
          mediaUrls: [
            "https://media.example.com/slide-1.png",
            "https://media.example.com/slide-2.png",
          ],
          mediaType: "image",
          aspect: "4:5",
          format: "carousel",
          carouselCount: 2,
          at: Date.parse("2026-07-24T03:00:00.000Z"),
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: 1 });
    expect(routeMocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          locationId_userId_clientId: {
            locationId: "location-1",
            userId: "user-1",
            clientId: "assistant-carousel",
          },
        },
        create: expect.objectContaining({
          organizationId: "tenant-1",
          mediaType: "image",
          mediaUrls: [
            "https://media.example.com/slide-1.png",
            "https://media.example.com/slide-2.png",
          ],
        }),
      }),
    );
  });

  it("checks location access before reading or writing history", async () => {
    routeMocks.resolveAccess.mockResolvedValue({ hasAccess: false });

    const readResponse = await getHistory();
    const writeResponse = await postHistory({
      locationId: "location-1",
      messages: [
        {
          id: "user-message",
          role: "user",
          text: "Private prompt",
          at: Date.now(),
        },
      ],
    });

    expect(readResponse.status).toBe(403);
    expect(writeResponse.status).toBe(403);
    expect(routeMocks.findMany).not.toHaveBeenCalled();
    expect(routeMocks.upsert).not.toHaveBeenCalled();
  });

  it("drops unsafe media URLs while preserving the conversation text", async () => {
    const response = await postHistory({
      locationId: "location-1",
      messages: [
        {
          id: "assistant-unsafe",
          role: "assistant",
          text: "Finished.",
          status: "done",
          imageUrl: "data:text/html,<script>alert(1)</script>",
          mediaUrls: ["javascript:alert(1)", "https://media.example.com/safe.png"],
          mediaType: "image",
          format: "single",
          at: Date.now(),
        },
      ],
    });

    expect(response.status).toBe(200);
    expect(routeMocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          mediaUrl: null,
          mediaUrls: ["https://media.example.com/safe.png"],
        }),
      }),
    );
  });
});
