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

    const qualityButton = page.getByRole("button", { name: "Image quality: Standard" });
    await expect(qualityButton).toBeVisible();
    await qualityButton.click();

    const qualityMenu = page.getByRole("listbox", { name: "Image model" });
    await expect(qualityMenu.getByRole("option", { name: /Draft/ })).toBeVisible();
    await expect(qualityMenu.getByRole("option", { name: /Standard/ })).toBeVisible();
    await expect(qualityMenu.getByRole("option", { name: /High/ })).toBeVisible();

    await qualityMenu.getByRole("option", { name: /Draft/ }).click();
    await expect(page.getByRole("button", { name: "Image quality: Draft" })).toBeVisible();
  });

  test("listing without photo shows add-listing-photo gate", async ({ page }) => {
    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill(LISTING_PROMPT);

    await expect(page.locator(".pb-listing-nudge")).toBeVisible();
    await expect(primaryActionButton(page)).toHaveText("Add listing photo");
  });

  test("shows live progress and lets a user cancel a slow image render", async ({ page }) => {
    let releaseGeneration!: () => void;
    let markGenerationStarted!: () => void;
    const generationGate = new Promise<void>((resolve) => {
      releaseGeneration = resolve;
    });
    const generationStarted = new Promise<void>((resolve) => {
      markGenerationStarted = resolve;
    });

    await page.route("**/api/studio/director", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platform: "instagram",
          lane: "photo",
          imagePrompt: "A polished launch announcement",
          allowText: false,
        }),
      });
    });
    await page.route("**/api/generate-image", async (route) => {
      markGenerationStarted();
      await generationGate;
      await route
        .fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            image: "https://media.example.com/late-generation.jpg",
            modelId: "mock-delayed-generation",
          }),
        })
        .catch(() => {
          // Canceling aborts the browser request before this delayed mock resolves.
        });
    });

    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill("Create an Instagram launch announcement");
    await primaryActionButton(page).click();
    await generationStarted;

    const working = page.locator('.studio-chat-msg-asst[data-status="working"]');
    await expect(working).toBeVisible();
    await expect(working).toContainText("Rendering your image");
    await expect(page.locator(".frame.generating .gen-progress")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel image generation" })).toBeVisible();
    await expect(prompt).toBeDisabled();

    await page.getByRole("button", { name: "Cancel image generation" }).click();
    releaseGeneration();

    await expect(page.locator('.studio-chat-msg-asst[data-status="error"]')).toContainText(
      "Canceled.",
    );
    await expect(prompt).toBeEnabled();
    await expect(primaryActionButton(page)).toBeEnabled();
    await expect(page.locator(".frame.done")).toBeHidden();
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

    await expect(page.locator(".pb-using-source img")).toBeVisible({ timeout: 15_000 });

    const createBtn = primaryActionButton(page);
    await expect(createBtn).toHaveText("Generate", { timeout: 10_000 });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    await expect(page.locator(".frame.done")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".frame.done .preview-img")).toBeVisible();

    expect(composeCalls).toBe(0);
    expect(generateCalls).toBe(0);
  });

  test("generates, previews, and scrolls through prior images", async ({ page }) => {
    await page.setViewportSize({ width: 1312, height: 618 });

    const imageUrls = ["#17325a", "#a3293f", "#68428f"].map((fill, index) => {
      const svg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${fill}"/><text x="540" y="675" fill="white" font-size="96" text-anchor="middle">Generation ${index + 1}</text></svg>`,
      ).toString("base64");
      return `data:image/svg+xml;base64,${svg}`;
    });
    let generationIndex = 0;
    let composeCalls = 0;
    let repromptCalls = 0;

    await page.route("**/api/studio/director", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platform: "instagram",
          lane: "photo",
          imagePrompt: "Mocked studio image prompt",
          allowText: false,
        }),
      });
    });
    await page.route("**/api/studio/compose", async (route) => {
      composeCalls += 1;
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
    await page.route("**/api/studio/reprompt", async (route) => {
      repromptCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imagePrompt: "Unexpected reprompt route" }),
      });
    });

    await page.route("**/api/generate-image", async (route) => {
      const image = imageUrls[Math.min(generationIndex, imageUrls.length - 1)];
      generationIndex += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ image, modelId: "mock-studio-history" }),
      });
    });
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "disabled in studio history test" }),
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

    const prompts = [
      "make an instagram post about a palm tree on the beach",
      "a crimson burger",
      "a violet coffee cup",
    ];
    const currentImage = stageImage;
    for (let index = 1; index < prompts.length; index += 1) {
      await prompt.fill(prompts[index]);
      await expect(primaryActionButton(page)).toBeEnabled();
      await primaryActionButton(page).click();
      await expect(currentImage).toHaveAttribute("src", imageUrls[index], { timeout: 30_000 });
      await expect(page.locator('.studio-chat-msg-asst[data-status="done"]')).toHaveCount(
        index + 1,
      );
    }
    expect(generationIndex).toBe(3);

    const feed = page.locator('[data-studio-generation-feed="true"]');
    const composerBox = await page.locator(".prompt-bar").boundingBox();
    const latestBox = await currentImage.boundingBox();
    expect(latestBox).not.toBeNull();
    expect(latestBox!.width).toBeGreaterThanOrEqual(240);
    expect(latestBox!.height).toBeGreaterThanOrEqual(300);
    await expect(currentImage).toBeInViewport({ ratio: 0.95 });

    const previousImages = page.locator('[data-studio-history-image="true"]');
    await expect(previousImages).toHaveCount(2);
    await expect(previousImages.first()).not.toBeInViewport();
    await expect
      .poll(() =>
        feed.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(2);
    const scrollMetrics = await feed.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

    await feed.hover({ position: { x: 24, y: 24 } });
    await page.mouse.wheel(0, -2400);
    await expect
      .poll(() => feed.evaluate((element) => element.scrollTop))
      .toBeLessThan(scrollMetrics.scrollTop);

    await expect(previousImages.first()).toBeInViewport({ ratio: 0.25 });
    await expect(page.getByRole("button", { name: "Latest image" })).toBeVisible();
    await expect(page.locator(".edit-rail")).toBeHidden();

    await previousImages.first().click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: "Full-size generated studio image" })).toHaveAttribute(
      "src",
      imageUrls[0],
    );
    await dialog.getByRole("button", { name: "Close image preview" }).click();
    await expect(currentImage).toHaveAttribute("src", imageUrls[2]);

    await page.getByRole("button", { name: "Latest image" }).click();
    await expect
      .poll(() =>
        feed.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(96);
    await expect(currentImage).toBeInViewport({ ratio: 0.95 });
    await expect(page.locator(".edit-rail")).toBeVisible();
    const latestBoxAfter = await currentImage.boundingBox();
    expect(latestBoxAfter).not.toBeNull();
    expect(latestBoxAfter!.width).toBeCloseTo(latestBox!.width, 0);
    expect(latestBoxAfter!.height).toBeCloseTo(latestBox!.height, 0);

    const composerBoxAfter = await page.locator(".prompt-bar").boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBoxAfter).not.toBeNull();
    expect(composerBoxAfter!.x).toBeCloseTo(composerBox!.x, 0);
    expect(composerBoxAfter!.y).toBeCloseTo(composerBox!.y, 0);
    expect(composerBoxAfter!.width).toBeCloseTo(composerBox!.width, 0);
    expect(composerBoxAfter!.height).toBeCloseTo(composerBox!.height, 0);

    generationIndex = 0;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
    for (let index = 0; index < 2; index += 1) {
      await prompt.fill(prompts[index]);
      await primaryActionButton(page).click();
      await expect(currentImage).toHaveAttribute("src", imageUrls[index], { timeout: 30_000 });
    }

    const mobileFeed = page.locator('[data-studio-generation-feed="true"]');
    const mobileHistoryImage = page.locator('[data-studio-history-image="true"]').first();
    await expect(currentImage).toBeInViewport({ ratio: 0.9 });
    await expect(mobileHistoryImage).not.toBeInViewport();
    await expect
      .poll(() =>
        mobileFeed.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(2);
    const mobileMetrics = await mobileFeed.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    expect(mobileMetrics.scrollHeight).toBeGreaterThan(mobileMetrics.clientHeight);
    const mobileComposerBox = await page.locator(".prompt-bar").boundingBox();
    expect(mobileComposerBox).not.toBeNull();
    expect(mobileComposerBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileComposerBox!.x + mobileComposerBox!.width).toBeLessThanOrEqual(390);
    expect(mobileComposerBox!.y + mobileComposerBox!.height).toBeLessThanOrEqual(844);

    await mobileFeed.hover({ position: { x: 20, y: 20 } });
    await page.mouse.wheel(0, -1800);
    await expect
      .poll(() => mobileFeed.evaluate((element) => element.scrollTop))
      .toBeLessThan(mobileMetrics.scrollTop);
    await expect(mobileHistoryImage).toBeInViewport({ ratio: 0.35 });
    await expect(page.getByRole("button", { name: "Latest image" })).toBeVisible();
    expect(composeCalls).toBe(0);
    expect(repromptCalls).toBe(0);
  });
});
