import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads dashboard with stat cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Six stat cards
    await expect(page.getByText("Properties")).toBeVisible();
    await expect(page.getByText("Units")).toBeVisible();
    await expect(page.getByText("Active Leases")).toBeVisible();
    await expect(page.getByText("Tenants")).toBeVisible();
    await expect(page.getByText("Income (MTD)")).toBeVisible();
    await expect(page.getByText("Expenses (MTD)")).toBeVisible();
  });

  test("shows income & expenses chart", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Income & Expenses")).toBeVisible();
    // Chart range selectors
    await expect(page.getByRole("button", { name: "7 Days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30 Days" })).toBeVisible();
  });

  test("stat card links navigate correctly", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Properties/i }).first().click();
    await expect(page).toHaveURL(/properties/);
  });
});
