import { test, expect } from "@playwright/test";

test.describe("Reports", () => {
  test("reports hub page loads with links", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /Reports/i })).toBeVisible();
    await expect(page.getByText(/Rent Roll/i)).toBeVisible();
    await expect(page.getByText(/Income.*Expense/i)).toBeVisible();
    await expect(page.getByText(/Tenant Statement/i)).toBeVisible();
  });

  test("rent roll report loads", async ({ page }) => {
    await page.goto("/reports/rent-roll");
    await expect(page.getByRole("heading", { name: /Rent Roll/i })).toBeVisible();
  });

  test("income & expense report loads", async ({ page }) => {
    await page.goto("/reports/income-expense");
    await expect(page.getByRole("heading", { name: /Income.*Expense/i })).toBeVisible();
  });

  test("tenant statement report loads", async ({ page }) => {
    await page.goto("/reports/tenant-statement");
    await expect(page.getByRole("heading", { name: /Tenant Statement/i })).toBeVisible();
  });
});
