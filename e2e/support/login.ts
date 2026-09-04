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

  // The app signs in, verifies claims, then router.push("/"). Wait for that
  // final route before persisting storageState so auth cookies are settled.
  await expect(page).toHaveURL((url) => url.pathname === "/");
}

export async function signInAsE2ETestOperator(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL / E2E_TEST_PASSWORD are missing — set them in .env.test");
  }

  await signInWithCredentials(page, email, password);
}
