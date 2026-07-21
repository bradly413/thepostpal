import { describe, expect, it } from "vitest";
import { mapCalendarPostToCreateInput } from "@/lib/scheduled-post-mappers";

describe("mapCalendarPostToCreateInput", () => {
  it("maps UI scheduled status to cron-queue approved", () => {
    const input = mapCalendarPostToCreateInput(
      {
        templateId: "t1",
        templateName: "Test",
        platform: "both",
        date: "2026-08-01",
        time: "09:00",
        caption: "Hello",
        status: "scheduled",
        pillar: "",
      },
      "loc-1",
    );
    expect(input.status).toBe("approved");
  });
});
