import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// E2E credentials and overrides live in .env.test (gitignored, see .env.example).
dotenv.config({ path: path.resolve(__dirname, ".env.test") });
// NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY for direct read-only REST calls
// from spec files (e.g. tenant-isolation.spec.ts's org-identity check) — the
// webServer's spawned Next process reads .env on its own, but the Playwright
// test runner process does not; load it here too. No-ops harmlessly when
// .env doesn't exist (CI supplies these as real job env vars instead).
dotenv.config({ path: path.resolve(__dirname, ".env") });

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const isLocalTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);

// These tests perform real sign-ins with real credentials — fail closed
// rather than let a misconfigured/malicious E2E_BASE_URL point that at
// production (ipix.co), someone else's vercel.app deployment, or any other
// host. Only localhost and this project's own Vercel previews are allowed —
// verified live (not guessed) from this repo's own PR deployment comments:
// ipixai-git-ai-ipi-1066-...-amo1000.vercel.app (PR #52),
// ipixai-git-e2e-playwright-setup-amo1000.vercel.app (PR #53). Project
// "ipixai" under the "amo1000" Vercel team/scope — any other vercel.app
// subdomain, including a bare one, is rejected.
const ALLOWED_PREVIEW_HOST = /^ipixai(-[a-z0-9-]+)?-amo1000\.vercel\.app$/i;
const parsedBaseUrl = new URL(baseURL);
const isAllowedBaseUrl =
  isLocalTarget ||
  (parsedBaseUrl.protocol === "https:" && ALLOWED_PREVIEW_HOST.test(parsedBaseUrl.hostname));
if (!isAllowedBaseUrl) {
  throw new Error(
    `E2E_BASE_URL "${baseURL}" is not localhost or an ipixai/amo1000 Vercel preview — refusing to run real sign-in against it.`,
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
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "setup-org-b",
      testMatch: /auth-org-b\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup", "setup-org-b"],
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
      dependencies: ["setup", "setup-org-b"],
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
