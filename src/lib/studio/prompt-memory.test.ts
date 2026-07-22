import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPromptMemory,
  pushPromptMemory,
  recentAsksHint,
  savePromptMemory,
} from "./prompt-memory";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
}

describe("prompt-memory", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("pushes, dedupes, and caps entries", () => {
    pushPromptMemory("loc1", { text: "first prompt" });
    pushPromptMemory("loc1", { text: "second prompt" });
    pushPromptMemory("loc1", { text: "first prompt" }); // dedupe + bump
    const list = loadPromptMemory("loc1");
    expect(list).toHaveLength(2);
    expect(list[0].text).toBe("first prompt");
    expect(list[1].text).toBe("second prompt");
  });

  it("stores aspect and carousel format metadata", () => {
    pushPromptMemory("loc1", {
      text: "carousel ask",
      aspect: "9:16",
      format: "carousel",
      carouselCount: 4,
    });
    const [entry] = loadPromptMemory("loc1");
    expect(entry.aspect).toBe("9:16");
    expect(entry.format).toBe("carousel");
    expect(entry.carouselCount).toBe(4);
  });

  it("builds a capped recent-asks hint", () => {
    savePromptMemory("loc1", [
      { text: "a".repeat(80), at: 3 },
      { text: "short", at: 2 },
      { text: "mid", at: 1 },
    ]);
    const hint = recentAsksHint(loadPromptMemory("loc1"), 3);
    expect(hint.startsWith("Recent asks:")).toBe(true);
    expect(hint.length).toBeLessThanOrEqual(220);
  });
});
