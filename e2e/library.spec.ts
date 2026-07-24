import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

const LIBRARY_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#17325a"/><text x="540" y="675" fill="white" font-size="72" text-anchor="middle">Mercy Recruiting</text></svg>',
  ).toString("base64");

test("downloads a Library image as PNG and carries it into Schedule", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1312, height: 618 });
  await page.route(/\/api\/photos\?locationId=/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        photos: [
          {
            id: "photo-mercy-1",
            organizationId: "demo-org",
            locationId: "demo-location",
            url: LIBRARY_IMAGE,
            mimeType: "image/svg+xml",
            alt: "Mercy recruiting flyer",
            createdAt: "2026-07-24T00:00:00.000Z",
          },
        ],
      }),
    });
  });
  await page.route("**/api/photos/photo-mercy-1/download", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition":
          'attachment; filename="Mercy-recruiting-flyer.png"',
      },
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3xkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });

  await loginAsDemo(page, "/dashboard/photos");
  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();

  const downloadButton = page.getByRole("button", {
    name: "Download Mercy recruiting flyer as PNG",
  });
  await expect(downloadButton).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Mercy-recruiting-flyer.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(downloadButton).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Schedule Mercy recruiting flyer" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1312, height: 618 });

  await page
    .getByRole("button", { name: "Schedule Mercy recruiting flyer" })
    .click();
  await page.waitForURL(/\/dashboard\/calendar\?from=library/, {
    timeout: 30_000,
  });
  const preview = page.locator('img[alt="Post preview photo"]');
  await expect(preview).toBeVisible({ timeout: 20_000 });
  await expect(preview).toHaveAttribute("src", LIBRARY_IMAGE);
});
