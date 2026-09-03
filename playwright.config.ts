import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// E2E credentials and overrides live in .env.test (gitignored, see .env.example).
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const isLocalTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);

// These tests perform real sign-ins with real credentials — fail closed
// rather than let a misconfigured/malicious E2E_BASE_URL point that at
// production (ipix.co) or an arbitrary attacker-controlled host. Only
// localhost and this project's own Vercel preview domain are allowed.
const isAllowedBaseUrl = isLocalTarget || /^https:\/\/[a-z0-9-]+\.vercel\.app(\/|$)/i.test(baseURL);
if (!isAllowedBaseUrl) {
  throw new Error(
    `E2E_BASE_URL "${baseURL}" is not localhost or a *.vercel.app preview — refusing to run real sign-in against it.`,
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Authenticates once via the real UI and persists storageState — every
    // other project depends on this instead of signing in per test.
    // https://playwright.dev/docs/auth
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
    {
      name: "mobile-chromium",
      // ~390px viewport (iPhone 12/13/14 width) on the Chromium engine
      // already cached locally — no extra browser download needed.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
      // login-journey does its own real UI login (not storageState) —
      // one extra hosted sign-in beyond setup is enough; running it per
      // viewport too would sign into the real account 3× per full run.
      testIgnore: /login-journey\.spec\.ts/,
    },
  ],

  // Only manage a dev server for a local target — a Preview/staging baseURL
  // (E2E_BASE_URL) is assumed already running and is never started by us.
  webServer: isLocalTarget
    ? {
        command: "npm run dev:ui",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
});
