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
  // Wait for React hydration so the submit button's onClick is attached —
  // a pre-hydration click on the type="button" control would be lost.
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="button"]');
    if (!btn) return false;
    return Object.values(btn).some(
      (v) => v && typeof v === "object" && "onClick" in v,
    );
  });
  // The marketing footer exposes an aria-label="Email" mailto link, so target
  // the form field by role to avoid a strict-mode collision.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The app signs in, verifies claims, then routes to /planner (IPI-1057
  // root cutover). Wait for that final route before persisting storageState
  // so auth cookies are settled. 15s — Supabase sign-in can be slow when the
  // full suite runs many auth requests in sequence.
  await expect(page).toHaveURL(
    (url) => url.pathname === "/planner",
    { timeout: 15_000 },
  );
}

export async function signInAsE2ETestOperator(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL / E2E_TEST_PASSWORD are missing — set them in .env.test");
  }

  await signInWithCredentials(page, email, password);
}