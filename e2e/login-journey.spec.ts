import { test, expect } from "@playwright/test";

/**
 * The one full UI login in the suite. Every other authenticated spec reuses
 * the setup project's storageState instead of repeating this — see
 * https://playwright.dev/docs/auth.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("critical journey: login → dashboard → brand navigation", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL / E2E_TEST_PASSWORD are missing — set them in .env.test");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "Open Brands" }).click();
  await expect(page).toHaveURL(/\/app\/brands$/);
});
