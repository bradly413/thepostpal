import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAsDemo } from "./helpers/auth";

const AUTH_FILE = path.join(__dirname, ".auth", "demo.json");

setup("authenticate as demo", async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await loginAsDemo(page, "/dashboard");
  await page.context().storageState({ path: AUTH_FILE });
});
