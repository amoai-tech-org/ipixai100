import path from "node:path";
import { test as setup } from "@playwright/test";

import { signInWithCredentials } from "./support/login";

const authFile = path.resolve(__dirname, "../playwright/.auth/user-org-b.json");

setup("authenticate as E2E org B operator", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL_ORG_B;
  const password = process.env.E2E_TEST_PASSWORD_ORG_B;
  // Skip, don't throw: chromium/mobile-chromium depend on this project
  // alongside `setup` (Org A). A hard failure here would fail the whole
  // setup project and take down every unrelated authenticated test
  // (dashboard, responsive, login-journey) the moment Org A's credentials
  // are provisioned but Org B's aren't yet — an entirely plausible partial
  // rollout, not a hypothetical. Only the Org B storageState ends up
  // missing; only tests that actually load it (tenant-isolation.spec.ts,
  // itself still test.fixme) are affected.
  setup.skip(
    !email || !password,
    "E2E_TEST_EMAIL_ORG_B / E2E_TEST_PASSWORD_ORG_B are missing — set them in .env.test",
  );

  await signInWithCredentials(page, email!, password!);
  await page.context().storageState({ path: authFile });
});
