import { expect, test } from "@playwright/test";

import { signInAsE2ETestOperator } from "./support/login";

/**
 * Production-only, non-destructive smoke coverage.
 *
 * This suite deliberately uses only the dedicated QA account and never
 * creates accounts, organizations, memberships, content, payments, or other
 * durable application state. It is runnable only through the separate
 * production Playwright config, which requires an explicit opt-in.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("production auth journey: sign in, app access, and sign out", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/signup",
  );

  await signInAsE2ETestOperator(page);
  await expect(page).toHaveURL(/\/app$/);

  await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

test("production marketing auth links work on desktop and mobile", async ({ browser }) => {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto("/");
  await expect(desktop.locator('header a[href="/login"]').filter({ hasText: "Sign in" })).toBeVisible();
  await expect(desktop.locator('header a[href="/signup"]').filter({ hasText: "Sign up" })).toBeVisible();
  await expect(desktop.locator('footer a[href="/login"]').filter({ hasText: "Sign in" })).toBeVisible();
  await expect(desktop.locator('footer a[href="/signup"]').filter({ hasText: "Sign up" })).toBeVisible();
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto("/");
  await mobile.getByRole("button", { name: "Toggle menu" }).click();
  const nav = mobile.getByRole("navigation", { name: "Mobile" });
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign up" })).toBeVisible();
  await nav.getByRole("link", { name: "Sign up" }).click();
  await expect(mobile).toHaveURL(/\/signup$/);
  await mobile.close();
});
