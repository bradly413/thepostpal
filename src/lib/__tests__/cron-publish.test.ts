import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeRow {
  id: string;
  organizationId: string;
  locationId: string | null;
  status: string;
  scheduledFor: Date | null;
  errorLog: string | null;
  updatedAt: Date;
}

// In-memory ScheduledPost store implementing the exact where-clauses the cron
// uses, so claim/skip/sweep semantics are exercised for real.
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

const metaMocks = vi.hoisted(() => ({
  publishToMeta: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({})),
  loadSecrets: vi.fn(async () => ({ pageToken: "tok", pageId: "page", igAccountId: "ig" })),
}));

vi.mock("server-only", () => ({}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  withCronDb: async (fn: (tx: unknown) => Promise<unknown>) => fn(store.tx),
}));

vi.mock("@/lib/meta-api", () => ({
  MetaApiError: class MetaApiError extends Error {
    toLogString() {
      return `[GRAPH_API] ${this.message}`;
    }
  },
  publishToMeta: metaMocks.publishToMeta,
}));

vi.mock("@/lib/meta-social-db", () => ({
  loadMetaBundleSecretsForCron: metaMocks.loadSecrets,
}));

import { processDueScheduledPosts } from "@/lib/cron-publish";
import { MetaApiError } from "@/lib/meta-api";

function row(overrides: Partial<FakeRow>): FakeRow {
  return {
    id: "post-1",
    organizationId: "org-1",
    locationId: "loc-1",
    status: "approved",
    scheduledFor: new Date(Date.now() - 60_000),
    errorLog: null,
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
    metaMocks.publishToMeta.mockReset();
    metaMocks.publishToMeta.mockResolvedValue({});
    metaMocks.loadSecrets.mockReset();
    metaMocks.loadSecrets.mockResolvedValue({ pageToken: "tok", pageId: "page", igAccountId: "ig" });
  });

  it("publishes a due approved post and records it", async () => {
    store.state.rows = [row({})];

    const result = await processDueScheduledPosts();

    expect(metaMocks.publishToMeta).toHaveBeenCalledTimes(1);
    expect(result.published).toBe(1);
    expect(getRow("post-1").status).toBe("published");
    expect(getRow("post-1").errorLog).toBeNull();
  });

  it('never dispatches "scheduled" (Meta-native) or future posts', async () => {
    store.state.rows = [
      row({ id: "native", status: "scheduled" }),
      row({ id: "future", scheduledFor: new Date(Date.now() + 60 * 60_000) }),
    ];

    const result = await processDueScheduledPosts();

    expect(metaMocks.publishToMeta).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
    expect(getRow("native").status).toBe("scheduled");
  });

  it("skips a post claimed by a concurrent run instead of double-publishing", async () => {
    store.state.rows = [
      row({ id: "post-a", scheduledFor: new Date(Date.now() - 120_000) }),
      row({ id: "post-b", scheduledFor: new Date(Date.now() - 60_000) }),
    ];
    // While post-a publishes, another run claims post-b (between this run's
    // findMany and its claim attempt).
    metaMocks.publishToMeta.mockImplementationOnce(async () => {
      getRow("post-b").status = "publishing";
      return {};
    });

    const result = await processDueScheduledPosts();

    expect(metaMocks.publishToMeta).toHaveBeenCalledTimes(1);
    expect(result.published).toBe(1);
    expect(result.skipped).toBe(1);
    expect(getRow("post-a").status).toBe("published");
    expect(getRow("post-b").status).toBe("publishing");
  });

  it('leaves a post in "publishing" when Meta succeeded but the status write failed', async () => {
    store.state.rows = [row({})];
    store.state.failUpdateFor = { id: "post-1", status: "published" };

    const result = await processDueScheduledPosts();

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(1);
    // Not "approved" (would re-publish) and not "failed" (a retry would duplicate).
    expect(getRow("post-1").status).toBe("publishing");
  });

  it("marks a failed Meta publish as failed with the error log", async () => {
    store.state.rows = [row({})];
    metaMocks.publishToMeta.mockRejectedValueOnce(
      new MetaApiError("Please reduce the amount of data", "RATE_LIMIT", 400),
    );

    const result = await processDueScheduledPosts();

    expect(result.failed).toBe(1);
    expect(getRow("post-1").status).toBe("failed");
    expect(getRow("post-1").errorLog).toContain("[GRAPH_API]");
  });

  it("marks a post failed when Meta is not connected", async () => {
    store.state.rows = [row({})];
    metaMocks.loadSecrets.mockResolvedValueOnce(null as never);

    const result = await processDueScheduledPosts();

    expect(metaMocks.publishToMeta).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(getRow("post-1").status).toBe("failed");
    expect(getRow("post-1").errorLog).toContain("not connected");
  });

  it("sweeps stale publishing claims to failed, leaving fresh claims alone", async () => {
    store.state.rows = [
      row({ id: "stale", status: "publishing", updatedAt: new Date(Date.now() - 20 * 60_000) }),
      row({ id: "fresh", status: "publishing", updatedAt: new Date(Date.now() - 2 * 60_000) }),
    ];

    const result = await processDueScheduledPosts();

    expect(result.staleClaims).toBe(1);
    expect(getRow("stale").status).toBe("failed");
    expect(getRow("stale").errorLog).toContain("interrupted");
    expect(getRow("fresh").status).toBe("publishing");
    expect(metaMocks.publishToMeta).not.toHaveBeenCalled();
  });
});
