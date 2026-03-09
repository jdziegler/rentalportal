import { test, expect } from "@playwright/test";

test.describe("Settings pages", () => {
  test("rent automation settings loads", async ({ page }) => {
    await page.goto("/settings/rent-automation");
    await expect(page.getByRole("heading", { name: /Rent Automation/i })).toBeVisible();
  });

  test("team settings loads", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: /Team/i })).toBeVisible();
  });

  test("account settings loads", async ({ page }) => {
    await page.goto("/settings/account");
    await expect(page.getByRole("heading", { name: /Account/i })).toBeVisible();
  });

  test("billing settings loads", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.getByRole("heading", { name: /Billing/i })).toBeVisible();
  });

  test("payments settings loads", async ({ page }) => {
    await page.goto("/settings/payments");
    await expect(page.getByRole("heading", { name: /Payment/i })).toBeVisible();
  });
});
