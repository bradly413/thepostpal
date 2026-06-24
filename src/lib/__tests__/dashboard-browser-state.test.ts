import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for the location-event storm suppression in
// dashboard-browser-state.ts. The no-op guard (`if existing === locationId return`)
// is what stops a feedback cascade: several hooks re-store the SAME active
// location on mount, and without the guard each redundant store dispatches
// LOCATION_EVENT -> listeners refetch -> re-render -> re-store (~136 /api/locations
// calls on one dashboard load). This test asserts an unchanged store neither
// writes nor dispatches.

function makeWindow() {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const setItem = vi.fn((k: string, v: string) => {
    store.set(k, String(v));
  });
  return {
    win: {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem,
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners.get(type)?.delete(fn);
      },
      dispatchEvent: (event: { type: string }) => {
        listeners.get(event.type)?.forEach((fn) => fn(event));
        return true;
      },
    },
    setItem,
  };
}

let setItemSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  const { win, setItem } = makeWindow();
  setItemSpy = setItem;
  vi.stubGlobal("window", win);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function importState() {
  vi.resetModules();
  return import("../dashboard-browser-state");
}

describe("setStoredActiveLocationId storm suppression", () => {
  it("dispatches once on a real change, never on unchanged re-stores", async () => {
    const { setStoredActiveLocationId, onStoredActiveLocationChange } = await importState();

    let dispatches = 0;
    const unsubscribe = onStoredActiveLocationChange(() => {
      dispatches += 1;
    });

    // First store of loc-1 is a real change (null -> loc-1): one dispatch.
    setStoredActiveLocationId("loc-1");
    // The storm: many hooks re-store the SAME id on mount/re-render.
    for (let i = 0; i < 25; i++) setStoredActiveLocationId("loc-1");

    expect(dispatches).toBe(1);
    // The 25 no-op stores must not even write to localStorage.
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    // A genuine change still propagates.
    setStoredActiveLocationId("loc-2");
    expect(dispatches).toBe(2);
    expect(setItemSpy).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("stops notifying after unsubscribe", async () => {
    const { setStoredActiveLocationId, onStoredActiveLocationChange } = await importState();

    let dispatches = 0;
    const unsubscribe = onStoredActiveLocationChange(() => {
      dispatches += 1;
    });

    setStoredActiveLocationId("loc-1");
    expect(dispatches).toBe(1);

    unsubscribe();
    setStoredActiveLocationId("loc-2");
    expect(dispatches).toBe(1); // no further notifications
  });
});
