import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

test.describe("Dashboard home", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, "/dashboard");
  });

  test("renders home with sidebar navigation", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Dashboard" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Create", exact: true })).toBeVisible();
  });

  test("mobile viewport keeps icon rail beside content", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const grid = page.locator(".home2").first();
    await expect(grid).toBeVisible();
    const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    expect(columns.split(" ").length).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("heading", { name: /Make your first post|Home/i }).first()).toBeVisible();
  });
});
