import { describe, expect, it } from "vitest";
import { getUpcomingHolidays } from "@/lib/holidays";
import { buildHeroHolidaySlides } from "@/lib/hero-holiday-slides";

describe("getUpcomingHolidays", () => {
  it("excludes holidays that already passed", () => {
    const from = new Date(2026, 6, 10); // July 10 2026
    const upcoming = getUpcomingHolidays({ from, limit: 20 });
    const names = upcoming.map((h) => h.name);
    expect(names).not.toContain("Juneteenth");
    expect(names).not.toContain("Independence Day");
    expect(names).not.toContain("Father's Day");
    expect(names.some((n) => n === "Labor Day")).toBe(true);
  });
});

describe("buildHeroHolidaySlides", () => {
  it("builds slides from upcoming holidays only", () => {
    const slides = buildHeroHolidaySlides(new Date(2026, 6, 10), 4);
    expect(slides.length).toBeGreaterThan(0);
    expect(slides.every((s) => s.title && s.date && s.brief)).toBe(true);
    expect(slides.map((s) => s.title)).not.toContain("Juneteenth");
  });
});
