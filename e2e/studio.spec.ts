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

  test("scenic brief generates and opens an accessible image preview", async ({ page }) => {
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
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#17325a"/></svg>',
      ).toString("base64");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          image: `data:image/svg+xml;base64,${svg}`,
          model: "standard",
        }),
      });
    });

    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill("make an instagram post about a palm tree on the beach");
    const createBtn = primaryActionButton(page);
    await expect(createBtn).toHaveText("Generate", { timeout: 10_000 });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    await expect(page.locator(".frame.done")).toBeVisible({ timeout: 30_000 });

    const enlarge = page.getByRole("button", { name: "Enlarge generated image" });
    await expect(enlarge).toBeVisible();
    const stageImage = enlarge.locator("img");
    const stageSrc = await stageImage.getAttribute("src");
    const stageStyle = await stageImage.getAttribute("style");
    const stageBox = await stageImage.boundingBox();

    await enlarge.click();
    const dialog = page.getByRole("dialog", { name: "Generated image preview" });
    const fullImage = dialog.getByRole("img", { name: "Full-size generated studio image" });
    await expect(dialog).toBeVisible();
    await expect(fullImage).toHaveAttribute("src", stageSrc!);
    await expect(fullImage).toHaveAttribute("style", stageStyle!);

    const fullBox = await fullImage.boundingBox();
    expect(stageBox).not.toBeNull();
    expect(fullBox).not.toBeNull();
    await expect
      .poll(async () => {
        const current = await fullImage.boundingBox();
        return current ? (current.width * current.height) / (stageBox!.width * stageBox!.height) : 0;
      })
      .toBeGreaterThan(1);
    await expect
      .poll(() => dialog.evaluate((element) => Number(getComputedStyle(element).opacity)))
      .toBeGreaterThan(0.99);
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Close image preview" })).toBeFocused();

    await fullImage.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(enlarge).toBeFocused();

    await enlarge.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close image preview" }).click();
    await expect(dialog).toBeHidden();

    await enlarge.click();
    await expect(dialog).toBeVisible();
    await page
      .locator('[data-overlay="Generated image preview"] > button[aria-label="Close dialog"]')
      .click({ position: { x: 12, y: 12 } });
    await expect(dialog).toBeHidden();
  });
});
