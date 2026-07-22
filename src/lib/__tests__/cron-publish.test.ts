import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeRow {
  id: string;
  organizationId: string;
  locationId: string | null;
  status: string;
  scheduledFor: Date | null;
  errorLog: string | null;
  publishedPlatforms: string[];
  publishResults: Record<string, unknown> | null;
  updatedAt: Date;
  mediaType?: string | null;
  platforms?: string[];
}

// In-memory ScheduledPost store implementing the exact where-clauses the cron
// uses, so claim/skip/sweep/record semantics are exercised for real.
const store = vi.hoisted(() => {
  const state = {
    rows: [] as FakeRow[],
    failUpdateFor: null as { id: string; status: string } | null,
  };

  interface Where {
    id?: string;
    status?: string | { in: string[] };
    scheduledFor?: { lte: Date; not: null };
    locationId?: { not: null };
    updatedAt?: { lt: Date };
  }

  function matches(row: FakeRow, where: Where): boolean {
    if (where.id !== undefined && row.id !== where.id) return false;
    if (typeof where.status === "string" && row.status !== where.status) return false;
    if (
      typeof where.status === "object" &&
      where.status !== null &&
      "in" in where.status &&
      !where.status.in.includes(row.status)
    )
      return false;
    if (where.scheduledFor?.lte && (!row.scheduledFor || row.scheduledFor > where.scheduledFor.lte))
      return false;
    if (where.locationId && row.locationId === null) return false;
    if (where.updatedAt?.lt && !(row.updatedAt < where.updatedAt.lt)) return false;
    return true;
  }

  const tx = {
    scheduledPost: {
      findMany: async ({ where, take }: { where: Where; take: number }) =>
        state.rows
          .filter((row) => matches(row, where))
          .sort((a, b) => (a.scheduledFor?.getTime() ?? 0) - (b.scheduledFor?.getTime() ?? 0))
          .slice(0, take)
          .map((row) => ({ ...row })),
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = state.rows.find((r) => r.id === where.id);
        return row ? { ...row } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeRow> }) => {
        const row = state.rows.find((r) => r.id === where.id);
        if (!row) throw new Error("Record not found");
        if (
          state.failUpdateFor &&
          state.failUpdateFor.id === where.id &&
          state.failUpdateFor.status === data.status
        ) {
          state.failUpdateFor = null;
          throw new Error("Simulated status-write failure");
        }
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }: { where: Where; data: Partial<FakeRow> }) => {
        const hits = state.rows.filter((row) => matches(row, where));
        for (const row of hits) Object.assign(row, data);
        return { count: hits.length };
      },
    },
  };

  return { state, tx };
});

// Faithful per-platform publish fake: honors the skip list, publishes facebook
// then instagram, stops at the first configured failure, awaits onPublished.
const metaMocks = vi.hoisted(() => {
  class FakeMetaApiError extends Error {
    toLogString() {
      return `[GRAPH_API] ${this.message}`;
    }
  }
  const state = {
    failPlatform: null as null | { platform: string; message: string },
    attempts: [] as string[],
    loadSecrets: vi.fn(async () => ({ pageToken: "tok", pageId: "page", igAccountId: "ig" })),
  };
  async function publishToMetaPerPlatform(
    post: { platforms: string[] },
    _token: string,
    _target: unknown,
    skipPlatforms: string[] = [],
    onPublished?: (platform: string, result: unknown) => Promise<void>,
  ) {
    const pending = (["facebook", "instagram"] as const).filter(
      (p) => post.platforms.includes(p) && !skipPlatforms.includes(p),
    );
    const outcome: {
      succeeded: Array<{ platform: string; result: unknown }>;
      failure?: { platform: string; error: FakeMetaApiError };
    } = { succeeded: [] };
    for (const platform of pending) {
      state.attempts.push(platform);
      if (state.failPlatform?.platform === platform) {
        outcome.failure = {
          platform,
          error: new FakeMetaApiError(state.failPlatform.message),
        };
        break;
      }
      const result = { id: `${platform}-graph-id` };
      outcome.succeeded.push({ platform, result });
      if (onPublished) await onPublished(platform, result);
    }
    return outcome;
  }
  return { state, FakeMetaApiError, publishToMetaPerPlatform };
});

vi.mock("server-only", () => ({}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  withCronDb: async (fn: (tx: unknown) => Promise<unknown>) => fn(store.tx),
}));

vi.mock("@/lib/meta-api", () => ({
  MetaApiError: metaMocks.FakeMetaApiError,
  publishToMetaPerPlatform: metaMocks.publishToMetaPerPlatform,
}));

vi.mock("@/lib/meta-social-db", () => ({
  loadMetaBundleSecretsForCron: metaMocks.state.loadSecrets,
}));

import { processDueScheduledPosts } from "@/lib/cron-publish";

function row(overrides: Partial<FakeRow>): FakeRow {
  return {
    id: "post-1",
    organizationId: "org-1",
    locationId: "loc-1",
    status: "approved",
    scheduledFor: new Date(Date.now() - 60_000),
    errorLog: null,
    publishedPlatforms: [],
    publishResults: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

function getRow(id: string): FakeRow {
  const found = store.state.rows.find((r) => r.id === id);
  if (!found) throw new Error(`missing row ${id}`);
  return found;
}

describe("processDueScheduledPosts", () => {
  beforeEach(() => {
    store.state.rows = [];
    store.state.failUpdateFor = null;
    metaMocks.state.failPlatform = null;
    metaMocks.state.attempts = [];
    metaMocks.state.loadSecrets.mockReset();
    metaMocks.state.loadSecrets.mockResolvedValue({
      pageToken: "tok",
      pageId: "page",
      igAccountId: "ig",
    });
  });

  it("publishes a due approved post and records per-platform results", async () => {
    store.state.rows = [row({ id: "post-1" })];
    // default platforms come from the row below
    store.state.rows[0] = { ...store.state.rows[0], ...{ } };
    Object.assign(store.state.rows[0], { platforms: ["facebook", "instagram"] });

    const result = await processDueScheduledPosts();

    expect(metaMocks.state.attempts).toEqual(["facebook", "instagram"]);
    expect(result.published).toBe(1);
    expect(getRow("post-1").status).toBe("published");
    expect(getRow("post-1").publishedPlatforms).toEqual(["facebook", "instagram"]);
    expect(getRow("post-1").publishResults).toMatchObject({
      facebook: { id: "facebook-graph-id" },
      instagram: { id: "instagram-graph-id" },
    });
  });

  it('never dispatches "scheduled" (Meta-native) or future posts', async () => {
    store.state.rows = [
      Object.assign(row({ id: "native", status: "scheduled" }), { platforms: ["facebook"] }),
      Object.assign(row({ id: "future", scheduledFor: new Date(Date.now() + 60 * 60_000) }), {
        platforms: ["facebook"],
      }),
    ];

    const result = await processDueScheduledPosts();

    expect(metaMocks.state.attempts).toEqual([]);
    expect(result.processed).toBe(0);
    expect(getRow("native").status).toBe("scheduled");
  });

  it("fails closed-beta video posts without calling Meta", async () => {
    store.state.rows = [
      Object.assign(row({ id: "vid-1", mediaType: "video" }), {
        platforms: ["facebook", "instagram"],
      }),
    ];

    const result = await processDueScheduledPosts();

    expect(metaMocks.state.attempts).toEqual([]);
    expect(result.failed).toBe(1);
    expect(getRow("vid-1").status).toBe("failed");
    expect(getRow("vid-1").errorLog).toMatch(/closed beta/i);
  });

  it("skips a post claimed by a concurrent run instead of double-publishing", async () => {
    store.state.rows = [
      Object.assign(row({ id: "post-a", scheduledFor: new Date(Date.now() - 120_000) }), {
        platforms: ["facebook"],
      }),
      Object.assign(row({ id: "post-b", scheduledFor: new Date(Date.now() - 60_000) }), {
        platforms: ["facebook"],
      }),
    ];
    // While post-a's secrets load, another run claims post-b.
    metaMocks.state.loadSecrets.mockImplementationOnce(async () => {
      getRow("post-b").status = "publishing";
      return { pageToken: "tok", pageId: "page", igAccountId: "ig" };
    });

    const result = await processDueScheduledPosts();

    expect(metaMocks.state.attempts).toEqual(["facebook"]);
    expect(result.published).toBe(1);
    expect(result.skipped).toBe(1);
    expect(getRow("post-a").status).toBe("published");
    expect(getRow("post-b").status).toBe("publishing");
  });

  it("records facebook as live when instagram fails, and a retry publishes only instagram", async () => {
    store.state.rows = [
      Object.assign(row({ id: "both-post" }), { platforms: ["facebook", "instagram"] }),
    ];
    metaMocks.state.failPlatform = { platform: "instagram", message: "IG container error" };

    const first = await processDueScheduledPosts();

    expect(first.failed).toBe(1);
    const after = getRow("both-post");
    expect(after.status).toBe("failed");
    expect(after.publishedPlatforms).toEqual(["facebook"]);
    expect(after.errorLog).toContain("instagram failed");
    expect(after.errorLog).toContain("Already live: facebook");
    expect(metaMocks.state.attempts).toEqual(["facebook", "instagram"]);

    // Retry: user re-queues; facebook must NOT be attempted again.
    metaMocks.state.failPlatform = null;
    metaMocks.state.attempts = [];
    after.status = "approved";

    const second = await processDueScheduledPosts();

    expect(second.published).toBe(1);
    expect(metaMocks.state.attempts).toEqual(["instagram"]);
    expect(getRow("both-post").status).toBe("published");
    expect(getRow("both-post").publishedPlatforms).toEqual(["facebook", "instagram"]);
  });

  it('leaves a post in "publishing" when Meta succeeded but the status write failed', async () => {
    store.state.rows = [Object.assign(row({}), { platforms: ["facebook"] })];
    store.state.failUpdateFor = { id: "post-1", status: "published" };

    const result = await processDueScheduledPosts();

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(1);
    // Not "approved" (would re-publish) and not "failed" (a retry would duplicate).
    expect(getRow("post-1").status).toBe("publishing");
    // The platform record itself was written before the status write failed.
    expect(getRow("post-1").publishedPlatforms).toEqual(["facebook"]);
  });

  it("marks a failed Meta publish as failed with the error log", async () => {
    store.state.rows = [Object.assign(row({}), { platforms: ["facebook"] })];
    metaMocks.state.failPlatform = { platform: "facebook", message: "Please reduce the amount of data" };

    const result = await processDueScheduledPosts();

    expect(result.failed).toBe(1);
    expect(getRow("post-1").status).toBe("failed");
    expect(getRow("post-1").errorLog).toContain("[GRAPH_API]");
    expect(getRow("post-1").publishedPlatforms).toEqual([]);
  });

  it("marks a post failed when Meta is not connected", async () => {
    store.state.rows = [Object.assign(row({}), { platforms: ["facebook"] })];
    metaMocks.state.loadSecrets.mockResolvedValueOnce(null as never);

    const result = await processDueScheduledPosts();

    expect(metaMocks.state.attempts).toEqual([]);
    expect(result.skipped).toBe(1);
    expect(getRow("post-1").status).toBe("failed");
    expect(getRow("post-1").errorLog).toContain("not connected");
  });

  it("sweeps stale publishing claims to failed, leaving fresh claims alone", async () => {
    store.state.rows = [
      Object.assign(row({ id: "stale", status: "publishing", updatedAt: new Date(Date.now() - 20 * 60_000) }), { platforms: ["facebook"] }),
      Object.assign(row({ id: "fresh", status: "publishing", updatedAt: new Date(Date.now() - 2 * 60_000) }), { platforms: ["facebook"] }),
    ];

    const result = await processDueScheduledPosts();

    expect(result.staleClaims).toBe(1);
    expect(getRow("stale").status).toBe("failed");
    expect(getRow("stale").errorLog).toContain("interrupted");
    expect(getRow("fresh").status).toBe("publishing");
    expect(metaMocks.state.attempts).toEqual([]);
  });
});
