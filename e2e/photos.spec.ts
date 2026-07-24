import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

function fixtureImage(label: string, color: string): string {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${color}"/><text x="540" y="675" fill="white" font-size="72" text-anchor="middle">${label}</text></svg>`,
  ).toString("base64");
  return `data:image/svg+xml;base64,${svg}`;
}

test.describe("Media library scheduling", () => {
  test("selects multiple images and opens them as a Schedule queue", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/photos?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          photos: [
            {
              id: "campaign-one",
              organizationId: "demo-org",
              locationId: "demo-location",
              url: fixtureImage("Campaign one", "#17325a"),
              mimeType: "image/png",
              alt: "Campaign one",
              createdAt: "2026-07-24T10:00:00.000Z",
            },
            {
              id: "campaign-two",
              organizationId: "demo-org",
              locationId: "demo-location",
              url: fixtureImage("Campaign two", "#a3293f"),
              mimeType: "image/png",
              alt: "Campaign two",
              createdAt: "2026-07-24T09:00:00.000Z",
            },
          ],
        }),
      });
    });

    await loginAsDemo(page, "/dashboard/photos");
    await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();

    await page
      .getByRole("checkbox", {
        name: "Select Campaign one for scheduling",
      })
      .check();
    await page
      .getByRole("checkbox", {
        name: "Select Campaign two for scheduling",
      })
      .check();

    await expect(page.getByRole("status")).toContainText("2 images selected");
    await page.getByRole("button", { name: "Schedule 2 images" }).click();

    await page.waitForURL(/\/dashboard\/calendar\?from=library/);
    await expect(
      page.getByRole("heading", { name: "Create Posts" }),
    ).toBeVisible();
    await expect(
      page.locator("p").filter({ hasText: "in queue" }).first(),
    ).toContainText("1 / 2 in queue");
  });
});
