import path from "node:path";
import { test as setup, expect } from "@playwright/test";

/**
 * https://playwright.dev/docs/auth — project-dependency auth setup.
 * Runs once, signs in through the real /login UI with the E2E test account,
 * and saves storageState for the chromium / mobile-chromium projects to
 * reuse via their `use.storageState`. No test signs in more than this once.
 */
const authFile = path.resolve(__dirname, "../playwright/.auth/user.json");

setup("authenticate as the E2E test operator", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL / E2E_TEST_PASSWORD are missing — set them in .env.test",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Sign-in redirects away from /login on success (see src/app/login/login-form.tsx).
  // A role="alert" region also exists on the destination page as an empty
  // live-region for future toasts — its mere presence isn't a failure signal,
  // so leaving /login is the correct (and only reliable) success check here.
  await expect(page).not.toHaveURL(/\/login$/);

  await page.context().storageState({ path: authFile });
});
