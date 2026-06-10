import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Verifies the GET de-duplication / short-TTL cache that collapses the
// dashboard-load request storm (~136 identical /api/locations + ~71 /api/issues
// calls per mount) down to one network request per key per load.
//
// The cache is module-level state, so each test re-imports the module via
// vi.resetModules() to start clean.

type FetchArgs = [input: string, init?: RequestInit];

function makeFetchMock(payloadFor: (url: string, init?: RequestInit) => unknown) {
  return vi.fn(async (...args: FetchArgs) => {
    const [url, init] = args;
    return {
      ok: true,
      json: async () => payloadFor(url, init),
    } as unknown as Response;
  });
}

async function importApi() {
  vi.resetModules();
  return import("../dashboard-api");
}

beforeEach(() => {
  vi.stubGlobal("fetch", makeFetchMock(() => ({ locations: [], issues: [] })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchDashboardLocations de-duplication", () => {
  it("coalesces concurrent identical GETs into one request", async () => {
    const fetchMock = makeFetchMock(() => ({ locations: [{ id: "a" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchDashboardLocations } = await importApi();

    const [first, second] = await Promise.all([
      fetchDashboardLocations(),
      fetchDashboardLocations(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual([{ id: "a" }]);
    expect(second).toEqual([{ id: "a" }]);
  });

  it("serves a just-resolved value within the TTL window", async () => {
    const fetchMock = makeFetchMock(() => ({ locations: [{ id: "a" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchDashboardLocations } = await importApi();

    await fetchDashboardLocations(); // network
    await fetchDashboardLocations(); // cache hit

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches after a location mutation invalidates the cache", async () => {
    const fetchMock = makeFetchMock((_url, init) =>
      init?.method === "POST" ? { location: { id: "b" } } : { locations: [{ id: "a" }] },
    );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchDashboardLocations, createDashboardLocation } = await importApi();

    await fetchDashboardLocations(); // GET #1
    await createDashboardLocation({ name: "New" }); // POST -> invalidates
    await fetchDashboardLocations(); // GET #2 (cache busted)

    const getCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? "GET") === "GET",
    );
    expect(getCalls).toHaveLength(2);
  });
});

describe("fetchDashboardIssues de-duplication", () => {
  it("dedupes per locationId but keeps distinct locations separate", async () => {
    const fetchMock = makeFetchMock(() => ({ issues: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchDashboardIssues } = await importApi();

    await Promise.all([
      fetchDashboardIssues("loc1"),
      fetchDashboardIssues("loc1"),
    ]);
    await fetchDashboardIssues("loc2");

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls.filter((u) => u.includes("loc1"))).toHaveLength(1);
    expect(urls.filter((u) => u.includes("loc2"))).toHaveLength(1);
  });
});
