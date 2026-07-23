import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const redisStore = new Map<string, unknown>();
const redisMocks = {
  set: vi.fn(async (key: string, value: unknown, _opts?: { ex?: number }) => {
    redisStore.set(key, value);
    return "OK";
  }),
  get: vi.fn(async (key: string) => redisStore.get(key) ?? null),
  del: vi.fn(async (key: string) => {
    redisStore.delete(key);
    return 1;
  }),
};

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => redisMocks),
}));

describe("calendar-pending-delete", () => {
  beforeEach(async () => {
    redisStore.clear();
    redisMocks.set.mockClear();
    redisMocks.get.mockClear();
    redisMocks.del.mockClear();
    vi.resetModules();
    const { getRedis } = await import("@/lib/redis");
    vi.mocked(getRedis).mockReturnValue(redisMocks as never);
  });

  it("stores and loads a pending delete via Redis so another instance can confirm", async () => {
    const {
      setCalendarPendingDelete,
      getCalendarPendingDelete,
      clearCalendarPendingDelete,
    } = await import("@/lib/calendar-pending-delete");

    const entry = {
      token: "tok-abc",
      tenantId: "org-1",
      locationId: "loc-1",
      userId: "user-1",
      ids: ["post-1", "post-2"],
      summary: "2 posts",
      expiresAt: Date.now() + 600_000,
    };

    await setCalendarPendingDelete(entry);
    expect(redisMocks.set).toHaveBeenCalledWith(
      "ai-cal-del:tok-abc",
      entry,
      { ex: 600 },
    );

    const loaded = await getCalendarPendingDelete("tok-abc");
    expect(loaded).toEqual(entry);
    expect(loaded?.ids).toEqual(["post-1", "post-2"]);

    await clearCalendarPendingDelete("tok-abc");
    expect(redisMocks.del).toHaveBeenCalledWith("ai-cal-del:tok-abc");
    expect(await getCalendarPendingDelete("tok-abc")).toBeNull();
  });

  it("rejects empty tokens", async () => {
    const { getCalendarPendingDelete } = await import(
      "@/lib/calendar-pending-delete"
    );
    expect(await getCalendarPendingDelete("")).toBeNull();
    expect(await getCalendarPendingDelete("   ")).toBeNull();
  });

  it("falls back to process memory when Redis is unavailable", async () => {
    const { getRedis } = await import("@/lib/redis");
    vi.mocked(getRedis).mockReturnValue(null);

    const {
      setCalendarPendingDelete,
      getCalendarPendingDelete,
      clearCalendarPendingDelete,
      __resetCalendarPendingDeleteMemoryForTests,
    } = await import("@/lib/calendar-pending-delete");

    __resetCalendarPendingDeleteMemoryForTests();

    const entry = {
      token: "mem-1",
      tenantId: "org-1",
      locationId: "loc-1",
      userId: "user-1",
      ids: ["p1"],
      summary: "1 post",
      expiresAt: Date.now() + 600_000,
    };

    await setCalendarPendingDelete(entry);
    expect(redisMocks.set).not.toHaveBeenCalled();
    expect(await getCalendarPendingDelete("mem-1")).toEqual(entry);

    await clearCalendarPendingDelete("mem-1");
    expect(await getCalendarPendingDelete("mem-1")).toBeNull();
  });

  it("expires in-memory entries past expiresAt", async () => {
    const { getRedis } = await import("@/lib/redis");
    vi.mocked(getRedis).mockReturnValue(null);

    const {
      setCalendarPendingDelete,
      getCalendarPendingDelete,
      __resetCalendarPendingDeleteMemoryForTests,
    } = await import("@/lib/calendar-pending-delete");

    __resetCalendarPendingDeleteMemoryForTests();

    await setCalendarPendingDelete({
      token: "stale",
      tenantId: "org-1",
      locationId: "loc-1",
      userId: "user-1",
      ids: ["p1"],
      summary: "stale",
      expiresAt: Date.now() - 1,
    });

    expect(await getCalendarPendingDelete("stale")).toBeNull();
  });
});
