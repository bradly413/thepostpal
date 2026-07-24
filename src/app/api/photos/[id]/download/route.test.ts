import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  photoFindFirst: vi.fn(),
  resolveAccess: vi.fn(),
  safeFetch: vi.fn(),
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
        photoAsset: {
          findFirst: routeMocks.photoFindFirst,
        },
      }),
  ),
}));

vi.mock("@/lib/authz", () => ({
  resolveAccess: routeMocks.resolveAccess,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => true),
  buildRateLimitKey: vi.fn(() => "test-key"),
  RateLimitUnavailableError: class RateLimitUnavailableError extends Error {},
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: routeMocks.safeFetch,
  readCappedBuffer: vi.fn(async (response: Response) =>
    Buffer.from(await response.arrayBuffer()),
  ),
}));

function downloadRequest(id = "photo-1") {
  return GET(
    new NextRequest(`http://localhost/api/photos/${id}/download`),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET /api/photos/[id]/download", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    routeMocks.resolveAccess.mockResolvedValue({ hasAccess: true });
    routeMocks.photoFindFirst.mockResolvedValue({
      id: "photo-1",
      locationId: "location-1",
      url: "https://media.example.com/mercy-recruiting.jpg",
      mimeType: "image/jpeg",
      alt: "Mercy Recruiting flyer.jpg",
    });
    const jpeg = await sharp({
      create: {
        width: 24,
        height: 30,
        channels: 3,
        background: "#17325a",
      },
    })
      .jpeg()
      .toBuffer();
    routeMocks.safeFetch.mockResolvedValue(
      new Response(new Uint8Array(jpeg), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
  });

  it("returns an authenticated PNG attachment for an accessible photo", async () => {
    const response = await downloadRequest();
    const bytes = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="Mercy-Recruiting-flyer.png"',
    );
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(routeMocks.safeFetch).toHaveBeenCalledWith(
      "https://media.example.com/mercy-recruiting.jpg",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "image/*" }),
      }),
      expect.objectContaining({ maxBytes: 25 * 1024 * 1024 }),
    );
  });

  it("does not fetch a photo outside the user's location access", async () => {
    routeMocks.resolveAccess.mockResolvedValue({ hasAccess: false });

    const response = await downloadRequest();

    expect(response.status).toBe(403);
    expect(routeMocks.safeFetch).not.toHaveBeenCalled();
  });

  it("rejects video assets before conversion", async () => {
    routeMocks.photoFindFirst.mockResolvedValue({
      id: "video-1",
      locationId: "location-1",
      url: "https://media.example.com/reel.mp4",
      mimeType: "video/mp4",
      alt: "Recruiting reel.mp4",
    });

    const response = await downloadRequest("video-1");

    expect(response.status).toBe(415);
    expect(routeMocks.safeFetch).not.toHaveBeenCalled();
  });
});
