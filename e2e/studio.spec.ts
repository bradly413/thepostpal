import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";
import { FIXTURE_LISTING_IMAGE, LISTING_PROMPT } from "./helpers/studio";

test.describe.configure({ mode: "serial" });

function primaryActionButton(page: import("@playwright/test").Page) {
  return page.locator(".prompt-bar .pb-generate-primary");
}

test.describe("Posterboy Studio", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, "/dashboard/studio");
    await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
    const newImage = page.getByRole("button", { name: "New image" });
    if (await newImage.isVisible().catch(() => false)) {
      await newImage.click();
    }
  });

  test("shows prompt bar and disables create when empty", async ({ page }) => {
    const prompt = page.locator(".prompt-bar textarea");
    await expect(prompt).toBeVisible();
    await expect(primaryActionButton(page)).toBeDisabled();
  });

  test("listing without photo shows add-listing-photo gate", async ({ page }) => {
    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill(LISTING_PROMPT);

    await expect(page.locator(".pb-listing-nudge")).toBeVisible();
    await expect(primaryActionButton(page)).toHaveText("Add listing photo");
  });

  test("listing with photo uses passthrough without calling generate-image", async ({ page }) => {
    let composeCalls = 0;
    let generateCalls = 0;

    await page.route("**/api/studio/compose", async (route) => {
      composeCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "compose should not run for listing passthrough" }),
      });
    });

    await page.route("**/api/generate-image", async (route) => {
      generateCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "generate-image should not run for listing passthrough" }),
      });
    });

    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill(LISTING_PROMPT);

    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(FIXTURE_LISTING_IMAGE);

    await expect(page.locator(".pb-ref-thumb img")).toBeVisible({ timeout: 15_000 });

    const createBtn = primaryActionButton(page);
    await expect(createBtn).toHaveText("Create post", { timeout: 10_000 });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    await expect(page.locator(".frame.done")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".frame.done img, .frame.done [style*='background-image']")).toBeVisible();

    expect(composeCalls).toBe(0);
    expect(generateCalls).toBe(0);
  });

  test("scenic brief calls mocked compose and generate-image", async ({ page }) => {
    await page.route("**/api/studio/compose", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platform: "instagram",
          imagePrompt: "Wide tropical beach with palm tree, level horizon.",
          caption: "",
          hashtags: [],
        }),
      });
    });

    await page.route("**/api/generate-image", async (route) => {
      const png =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          image: `data:image/png;base64,${png}`,
          model: "standard",
        }),
      });
    });

    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill("make an instagram post about a palm tree on the beach");
    const createBtn = primaryActionButton(page);
    await expect(createBtn).toHaveText("Create post", { timeout: 10_000 });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    await expect(page.locator(".frame.done")).toBeVisible({ timeout: 30_000 });
  });
});
