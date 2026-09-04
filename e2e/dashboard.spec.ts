import { test, expect } from "@playwright/test";

// PR #52 (IPI-1066) merged — /app is the real Command Center now, not the
// pre-merge placeholder. These assertions run for real.
test.describe("dashboard (authenticated)", () => {
  test("loads /app without console or page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    expect(errors, `console/page errors: ${errors.join("; ")}`).toEqual([]);
  });

  test("shows the honest empty state for the QA test org (0 brands)", async ({ page }) => {
    // The E2E account's org ("QA iPix Isolation A") has 0 brands by design —
    // this is real live state, not a fixture, so the empty state is the
    // deterministic expected outcome, not a fake "No data" placeholder.
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "No brands yet" })).toBeVisible();
  });

  test("quick links have distinct accessible names and correct destinations", async ({ page }) => {
    await page.goto("/app");

    const brands = page.getByRole("link", { name: "Open Brands" });
    const shoots = page.getByRole("link", { name: "Open Shoots" });
    const plans = page.getByRole("link", { name: "Open Plans" });

    await expect(brands).toHaveAttribute("href", "/app/brands");
    await expect(shoots).toHaveAttribute("href", "/app/shoots");
    await expect(plans).toHaveAttribute("href", "/app/plans");
  });

  test("Brands quick link navigates to /app/brands", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("link", { name: "Open Brands" }).click();
    await expect(page).toHaveURL(/\/app\/brands$/);
  });

  test("Shoots quick link navigates to /app/shoots", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("link", { name: "Open Shoots" }).click();
    await expect(page).toHaveURL(/\/app\/shoots$/);
  });

  test("Plans quick link navigates to /app/plans", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("link", { name: "Open Plans" }).click();
    await expect(page).toHaveURL(/\/app\/plans$/);
  });
});
