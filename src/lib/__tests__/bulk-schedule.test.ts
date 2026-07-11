import { describe, expect, it } from "vitest";
import { resolvePostingDate, scheduledForISO } from "@/lib/bulk-schedule";

describe("bulk-schedule", () => {
  it("spaces posts by interval days", () => {
    const a = resolvePostingDate("2026-07-10", "09:00", 0, 2, false);
    const b = resolvePostingDate("2026-07-10", "09:00", 1, 2, false);
    expect(b.getDate() - a.getDate()).toBe(2);
  });

  it("skips weekends when enabled", () => {
    // Friday July 10 2026 + 1 day with skip weekends -> Monday July 13
    const iso = scheduledForISO("2026-07-10", "09:00", 1, 1, true);
    const d = new Date(iso);
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(13);
  });

  it("bumps a Saturday start to Monday", () => {
    // Saturday July 11 2026
    const d = resolvePostingDate("2026-07-11", "09:00", 0, 1, true);
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(13);
  });
});
