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
  await page.setViewportSize({ width: 1011, height: 618 });
  const preview = page.locator('img[alt="Post preview photo"]');
  await expect(preview).toBeVisible({ timeout: 20_000 });
  await expect(preview).toHaveAttribute("src", LIBRARY_IMAGE);
  const previewBox = await preview.boundingBox();
  expect(previewBox).not.toBeNull();
  expect(previewBox!.width).toBeGreaterThanOrEqual(360);
  expect(previewBox!.height).toBeGreaterThanOrEqual(450);
});

test("chooses existing image or video from Library inside Schedule", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1312, height: 618 });
  let captionCalls = 0;
  await page.route("**/api/ai/captions-from-image", async (route) => {
    captionCalls += 1;
    const prefix = captionCalls === 1 ? "First" : "Fresh";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        variants: [
          {
            angle: "Direct",
            caption: `${prefix} recruiting caption`,
            hashtags: ["#nursing"],
          },
          {
            angle: "Purpose",
            caption: `${prefix} purpose caption`,
            hashtags: ["#careers"],
          },
          {
            angle: "Community",
            caption: `${prefix} community caption`,
            hashtags: ["#team"],
          },
        ],
      }),
    });
  });
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
          {
            id: "video-mercy-1",
            organizationId: "demo-org",
            locationId: "demo-location",
            url: "https://cdn.example.com/mercy-recruiting.mp4",
            mimeType: "video/mp4",
            alt: "Mercy recruiting video",
            createdAt: "2026-07-23T00:00:00.000Z",
          },
        ],
      }),
    });
  });

  await loginAsDemo(page, "/dashboard/calendar");
  await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
  await page.getByRole("button", { name: "Choose from Library" }).click();

  const picker = page.getByRole("dialog", { name: "Choose from Library" });
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole("button", {
      name: "Use Mercy recruiting flyer from Library",
    }),
  ).toBeVisible();

  await picker.getByRole("button", { name: "Videos" }).click();
  await expect(
    picker.getByRole("button", {
      name: "Use Mercy recruiting video from Library",
    }),
  ).toBeVisible();
  await expect(
    picker.getByRole("button", {
      name: "Use Mercy recruiting flyer from Library",
    }),
  ).toBeHidden();

  await picker.getByRole("button", { name: "All" }).click();
  await picker
    .getByRole("button", {
      name: "Use Mercy recruiting flyer from Library",
    })
    .click();

  await expect(picker).toBeHidden();
  const preview = page.locator('img[alt="Post preview photo"]');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("src", LIBRARY_IMAGE);

  const caption = page.locator('textarea[placeholder="Write your caption…"]');
  await page.getByRole("button", { name: "Write caption" }).click();
  await expect(caption).toHaveValue("First recruiting caption #nursing");

  const approveCaption = page.getByRole("button", { name: "Approve caption" });
  await approveCaption.click();
  await expect(
    page.getByRole("button", { name: "Caption approved" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(5_500);
  await expect(caption).toHaveValue("First recruiting caption #nursing");

  await page.getByRole("button", { name: "Regenerate caption" }).click();
  await expect(caption).toHaveValue("Fresh recruiting caption #nursing");
  await expect(page.getByRole("button", { name: "Approve caption" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Library" }).click();
  await expect(picker).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search Library" })).toBeVisible();
});
