import type { Page } from "@playwright/test";

export async function loginAsDemo(page: Page, landing = "/dashboard") {
  await page.goto(landing);
  if (!/sign-in/.test(page.url())) {
    return;
  }
  await page.locator("#username").fill("demo");
  await page.locator("#password").fill("demo123");
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 45_000 }),
    page.getByRole("button", { name: "Sign In" }).click(),
  ]);
  if (!page.url().includes(landing)) {
    await page.goto(landing);
    await page.waitForLoadState("domcontentloaded");
  }
}
