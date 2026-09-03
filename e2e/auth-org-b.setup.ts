import path from "node:path";
import { test as setup } from "@playwright/test";

import { signInWithCredentials } from "./support/login";

const authFile = path.resolve(__dirname, "../playwright/.auth/user-org-b.json");

setup("authenticate as E2E org B operator", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL_ORG_B;
  const password = process.env.E2E_TEST_PASSWORD_ORG_B;
  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL_ORG_B / E2E_TEST_PASSWORD_ORG_B are missing — set them in .env.test",
    );
  }

  await signInWithCredentials(page, email, password);
  await page.context().storageState({ path: authFile });
});
