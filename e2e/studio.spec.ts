import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";
import { FIXTURE_LISTING_IMAGE, LISTING_PROMPT } from "./helpers/studio";

test.describe.configure({ mode: "serial" });

function primaryActionButton(page: import("@playwright/test").Page) {
  return page.locator(".prompt-bar .pb-generate-primary");
}

test.describe("Posterboy Studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/studio/history**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: [], nextCursor: null }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: 0 }),
      });
    });
    await loginAsDemo(page, "/dashboard/studio");
    await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
    const newImage = page.getByRole("button", { name: "New image" });
    if (await newImage.isVisible().catch(() => false)) {
      await newImage.click();
    }
  });

  test("shows prompt bar and disables create when empty", async ({ page }) => {
    await page.setViewportSize({ width: 1312, height: 618 });
    const prompt = page.locator(".prompt-bar textarea");
    await expect(prompt).toBeVisible();
    await expect(primaryActionButton(page)).toBeDisabled();

    const controls = page.locator(".prompt-bar .pb-bar-controls");
    const modeTabs = page.getByRole("group", { name: "Studio mode" });
    const aspectButton = page.getByRole("button", { name: /^Aspect ratio:/ });
    await expect(modeTabs).toBeVisible();
    await expect(aspectButton).toBeVisible();
    expect(
      await controls.evaluate((element) => {
        const tabs = element.querySelector(".pb-mode-tabs");
        const aspect = element.querySelector(".pb-aspect-chip");
        return Boolean(
          tabs &&
            aspect &&
            tabs.compareDocumentPosition(aspect) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }),
    ).toBe(true);
    await expect(controls.locator(".pb-mode-tabs")).toHaveCount(1);
    await expect(page.locator(".prompt-bar > .pb-bar-head")).toHaveCount(0);
    const composerBox = await page.locator(".prompt-bar").boundingBox();
    const inputBox = await page.locator(".prompt-bar .pb-bar-input").boundingBox();
    expect(composerBox?.width).toBeGreaterThanOrEqual(800);
    expect(inputBox?.height).toBeLessThanOrEqual(44);

    const qualityButton = page.getByRole("button", { name: "Image quality: Standard" });
    await expect(qualityButton).toBeVisible();
    await qualityButton.click();

    const qualityMenu = page.getByRole("listbox", { name: "Image model" });
    await expect(qualityMenu.getByRole("option", { name: /Draft/ })).toBeVisible();
    await expect(qualityMenu.getByRole("option", { name: /Standard/ })).toBeVisible();
    await expect(qualityMenu.getByRole("option", { name: /High/ })).toBeVisible();

    await qualityMenu.getByRole("option", { name: /Draft/ }).click();
    await expect(page.getByRole("button", { name: "Image quality: Draft" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileComposerBox = await page.locator(".prompt-bar").boundingBox();
    expect(mobileComposerBox).not.toBeNull();
    expect(mobileComposerBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileComposerBox!.x + mobileComposerBox!.width).toBeLessThanOrEqual(390);
    expect(mobileComposerBox!.height).toBeLessThanOrEqual(430);
    await expect(modeTabs).toBeVisible();
    await expect(controls.locator(".pb-mode-tabs")).toHaveCount(1);
  });

  test("enhances a prompt with visible success and error feedback", async ({
    page,
  }) => {
    let enhanceCalls = 0;
    await page.route("**/api/enhance-prompt", async (route) => {
      enhanceCalls += 1;
      if (enhanceCalls === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            enhanced:
              "Extreme close-up of a chef confidently chopping vivid fresh herbs in crisp directional light.",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Prompt enhancement is temporarily unavailable" }),
      });
    });

    const prompt = page.locator(".prompt-bar textarea");
    const enhance = page.getByRole("button", { name: "Enhance my prompt" });
    await prompt.fill("chef cutting herbs");
    await enhance.click();

    await expect(prompt).toHaveValue(
      "Extreme close-up of a chef confidently chopping vivid fresh herbs in crisp directional light.",
    );
    await expect(enhance).toContainText("Enhanced");
    await expect(page.locator(".studio-soft-notice")).toContainText("Prompt enhanced");
    expect(await prompt.evaluate((element) => element.scrollTop)).toBe(0);

    await prompt.fill("chef plating dinner");
    await enhance.click();
    await expect(prompt).toHaveValue("chef plating dinner");
    await expect(enhance).toContainText("Try again");
    await expect(page.locator(".studio-error")).toContainText(
      "Prompt enhancement is temporarily unavailable",
    );
  });

  test("presents video creation as one responsive production workspace", async ({ page }) => {
    await page.setViewportSize({ width: 1312, height: 618 });
    await page.getByRole("button", { name: "Video mode" }).click();

    const videoComposer = page.locator('[data-video-composer="true"]');
    await expect(
      page.getByRole("heading", { name: "Create an 8-second video" }),
    ).toBeVisible();
    await expect(page.getByText("Prompt structure")).toBeVisible();
    await expect(page.getByText("Upload your own video")).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose video" })).toBeVisible();
    await expect(page.getByLabel("Describe your video")).toBeVisible();
    await expect(primaryActionButton(page)).toHaveText("Create video");
    await expect(page.locator(".studio-video-compose textarea")).toHaveCount(0);

    const desktopComposerBox = await videoComposer.boundingBox();
    expect(desktopComposerBox).not.toBeNull();
    expect(desktopComposerBox!.width).toBeGreaterThanOrEqual(760);
    expect(desktopComposerBox!.height).toBeLessThanOrEqual(320);

    await page.getByRole("button", { name: "Choose video" }).focus();
    await expect(page.getByRole("button", { name: "Choose video" })).toBeFocused();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileComposerBox = await videoComposer.boundingBox();
    expect(mobileComposerBox).not.toBeNull();
    expect(mobileComposerBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileComposerBox!.x + mobileComposerBox!.width).toBeLessThanOrEqual(390);
  });

  test("listing without photo shows add-listing-photo gate", async ({ page }) => {
    const prompt = page.locator(".prompt-bar textarea");
    await prompt.fill(LISTING_PROMPT);

    await expect(page.locator(".pb-listing-nudge")).toBeVisible();
    await expect(primaryActionButton(page)).toHaveText("Add listing photo");
  });

  test("shows live progress and lets a user cancel a slow image render", async ({ page }) => {
    await page.setViewportSize({ width: 959, height: 736 });
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
    const generatingStage = await page.locator(".studio-stage").boundingBox();
    expect(generatingStage?.height).toBeLessThanOrEqual(441);
    await expect(prompt).toBeInViewport();

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
      "make an instagram post about a palm tree on the beach",
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
    await expect(mobileHistoryImage).toBeInViewport({ ratio: 0.34 });
    await expect(page.getByRole("button", { name: "Latest image" })).toBeVisible();
    expect(composeCalls).toBe(0);
    expect(repromptCalls).toBe(0);
  });

  test("restores persisted conversations, images, and videos after reload", async ({
    page,
  }) => {
    await page.unroute("**/api/studio/history**");
    const stored = new Map<string, Record<string, unknown>>();
    await page.route("**/api/studio/history**", async (route) => {
      if (route.request().method() === "GET") {
        const messages = [...stored.values()].sort(
          (a, b) => Number(a.at ?? 0) - Number(b.at ?? 0),
        );
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages, nextCursor: null }),
        });
        return;
      }
      const payload = route.request().postDataJSON() as {
        messages?: Record<string, unknown>[];
      };
      for (const message of payload.messages ?? []) {
        stored.set(String(message.id), message);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: payload.messages?.length ?? 0 }),
      });
    });

    const imageUrls = ["#194d70", "#9b3c55"].map((fill, index) => {
      const svg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${fill}"/><text x="540" y="675" fill="white" font-size="88" text-anchor="middle">Saved ${index + 1}</text></svg>`,
      ).toString("base64");
      return `data:image/svg+xml;base64,${svg}`;
    });
    let generationIndex = 0;
    await page.route("**/api/studio/director", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platform: "instagram",
          lane: "photo",
          imagePrompt: "Persisted Studio test image",
          allowText: false,
        }),
      });
    });
    await page.route("**/api/generate-image", async (route) => {
      const image = imageUrls[Math.min(generationIndex, imageUrls.length - 1)];
      generationIndex += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ image, modelId: "mock-persisted-studio-history" }),
      });
    });
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "disabled in persistence test" }),
      });
    });

    const prompt = page.locator(".prompt-bar textarea");
    const prompts = ["Create a navy launch image", "Create a berry follow-up image"];
    for (let index = 0; index < prompts.length; index += 1) {
      await prompt.fill(prompts[index]);
      await primaryActionButton(page).click();
      await expect(page.locator(".studio-result-stage img")).toHaveAttribute(
        "src",
        imageUrls[index],
        { timeout: 30_000 },
      );
    }
    await expect
      .poll(
        () =>
          [...stored.values()].filter(
            (message) => message.role === "assistant" && message.status === "done",
          ).length,
        { timeout: 10_000 },
      )
      .toBe(2);

    const oldVideoAt = Date.now() - 60_000;
    stored.set("saved-video-user", {
      id: "saved-video-user",
      role: "user",
      text: "Create a short recruiting reel",
      at: oldVideoAt,
    });
    stored.set("saved-video-assistant", {
      id: "saved-video-assistant",
      role: "assistant",
      text: "Here’s your video.",
      status: "done",
      imageUrl: "/videos/ai-aurora.webm",
      mediaUrls: ["/videos/ai-aurora.webm"],
      mediaType: "video",
      aspect: "9:16",
      format: "single",
      at: oldVideoAt + 1,
    });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
    const feed = page.locator('[data-studio-generation-feed="true"]');
    await expect(feed.getByText(prompts[0], { exact: true })).toBeVisible();
    await expect(feed.getByText(prompts[1], { exact: true })).toBeVisible();
    await expect(page.locator(".studio-result-stage img")).toHaveAttribute(
      "src",
      imageUrls[1],
      { timeout: 15_000 },
    );
    await expect(
      page.locator('video[aria-label="Previous generated studio video"]'),
    ).toHaveCount(1);

    const metrics = await feed.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    await feed.hover({ position: { x: 20, y: 20 } });
    await page.mouse.wheel(0, -2200);
    await expect.poll(() => feed.evaluate((element) => element.scrollTop)).toBeLessThan(
      metrics.scrollTop,
    );
    await expect(page.getByText("Create a short recruiting reel", { exact: true })).toBeInViewport();
  });
});
