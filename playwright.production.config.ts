import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const PRODUCTION_BASE_URL = "https://www.ipix.co";

if (process.env.E2E_PRODUCTION_SMOKE !== "1") {
  throw new Error(
    "Production Playwright smoke is disabled. Run `npm run e2e:production` to opt in explicitly.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: /production-smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: PRODUCTION_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
