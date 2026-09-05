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
  // The form is client-only (ssr: false), so it only appears after React
  // mounts and the submit handler is attached. Waiting for the accessible
  // "Sign in" button synchronizes with that mount without inspecting private
  // React internals. In signin mode the toggle reads "Create an account", so
  // this name is unambiguous.
  const signIn = page.getByRole("button", { name: "Sign in" });
  await signIn.waitFor({ state: "visible" });
  // The marketing footer exposes an aria-label="Email" mailto link, so target
  // the form field by role to avoid a strict-mode collision.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await signIn.click();

  // The app signs in, verifies claims, then routes to /app (IPI-1058
  // MARKETING-LOGIN-001 — the Command Center is the default workspace). Wait
  // for that final route before persisting storageState so auth cookies are
  // settled. 30s — a cold CI runner compiling /app on demand (Next dev,
  // first hit) plus a slow Supabase sign-in in sequence measured over 15s
  // on GitHub Actions; 30s gave headroom without touching the global
  // Playwright timeout.
  await expect(page).toHaveURL(
    (url) => url.pathname === "/app",
    { timeout: 30_000 },
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