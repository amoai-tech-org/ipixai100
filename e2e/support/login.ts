import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared UI login used by auth.setup.ts (the one storageState-producing
 * login) and login-journey.spec.ts (the one deliberate extra UI login that
 * proves the form itself, not just a saved cookie). Centralized so a label,
 * route, or credential-env-var change only needs one edit.
 */
export async function signInWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Sign-in redirects away from /login on success (see src/app/login/login-form.tsx).
  // A role="alert" region also exists on the destination page as an empty
  // live-region for future toasts — its mere presence isn't a failure signal,
  // so leaving /login is the correct (and only reliable) success check here.
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function signInAsE2ETestOperator(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL / E2E_TEST_PASSWORD are missing — set them in .env.test");
  }

  await signInWithCredentials(page, email, password);
}
